import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

/**
 * Runtime configuration for the RecursivePraxis CLI.
 *
 * Settings are chosen once at install time by `lambda init` and persisted to
 * `<baseDir>/config.json`. They are not read from the environment, so a stray
 * shell variable can never silently re-point the runtime.
 *
 * Precedence: built-in default < config file < explicit override. Values are
 * validated on assignment, and `require` fails closed naming the exact way to
 * supply the missing value.
 *
 * Instances are immutable — `with` returns a new `Settings`.
 */

export const CONFIG_FILE = "config.json";
export const DEFAULT_SESSION_DIR = ".recursive-praxis";

export type SettingsSource = "default" | "file" | "override";

const injectionSchema = z.enum(["on", "off"]);

export const CONTEXT_INJECTION_VALUES = injectionSchema.options;
export type ContextInjection = z.infer<typeof injectionSchema>;

interface SettingDescriptor {
  /** How an operator supplies this setting; quoted verbatim in errors. */
  readonly supply: string;
  readonly defaultValue?: string;
  readonly parse: (raw: string) => string;
}

const DESCRIPTORS = {
  /**
   * Whether the `context-injection` hook prepends the session briefing to
   * every turn. It exists as a setting rather than as "delete the hook"
   * because the hook is written into host config files by `lambda init` —
   * switching it off by hand-editing those files would be reported as drift
   * by `lambda doctor` on every run afterwards.
   */
  contextInjection: {
    supply: "lambda init --context-injection <on|off>",
    defaultValue: "on",
    parse: (raw) => injectionSchema.parse(raw.trim()),
  },
} as const satisfies Record<string, SettingDescriptor>;

export type SettingKey = keyof typeof DESCRIPTORS;

export const SETTING_KEYS = Object.keys(DESCRIPTORS).sort() as readonly SettingKey[];

export type SettingsSnapshot = { readonly [K in SettingKey]?: string };
export type SettingsPatch = { readonly [K in SettingKey]?: string | undefined };

export interface SettingsLoadOptions {
  readonly cwd?: string;
  /** Defaults to `<cwd>/.recursive-praxis`. */
  readonly baseDir?: string;
  readonly overrides?: SettingsPatch;
}

interface Entry {
  readonly value: string;
  readonly source: SettingsSource;
}

function isSettingKey(value: string): value is SettingKey {
  return Object.hasOwn(DESCRIPTORS, value);
}

function descriptorOf(key: SettingKey): SettingDescriptor {
  return DESCRIPTORS[key];
}

export class SettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsError";
  }
}

export class Settings {
  private constructor(
    /** Absolute path to the session directory holding `config.json`. */
    readonly baseDir: string,
    private readonly entries: ReadonlyMap<SettingKey, Entry>,
  ) {}

  /** Built-in defaults only — no config file. */
  static defaults(cwd: string = process.cwd(), baseDir?: string): Settings {
    const entries = new Map<SettingKey, Entry>();
    for (const key of SETTING_KEYS) {
      const value = descriptorOf(key).defaultValue;
      if (value !== undefined) entries.set(key, { value, source: "default" });
    }
    return new Settings(path.resolve(cwd, baseDir ?? DEFAULT_SESSION_DIR), entries);
  }

  /**
   * Defaults, then the config file, then explicit overrides. A missing config
   * file is not an error — it means the runtime is still on its defaults.
   */
  static async load(options: SettingsLoadOptions = {}): Promise<Settings> {
    const base = Settings.defaults(options.cwd ?? process.cwd(), options.baseDir);
    const fileValues = await readConfigFile(base.configFilePath());
    return base.layer("file", fileValues).layer("override", options.overrides ?? {});
  }

  /** The resolved value, or `undefined` when the setting is not configured. */
  get(key: SettingKey): string | undefined {
    return this.entries.get(key)?.value;
  }

  /** Fail-closed read: throws naming how to supply the value when unset. */
  require(key: SettingKey): string {
    const value = this.get(key);
    if (value === undefined) {
      const descriptor = descriptorOf(key);
      throw new SettingsError(`${key} is not configured — run: ${descriptor.supply}`);
    }
    return value;
  }

  has(key: SettingKey): boolean {
    return this.entries.has(key);
  }

  /** Which layer supplied the resolved value. */
  sourceOf(key: SettingKey): SettingsSource | undefined {
    return this.entries.get(key)?.source;
  }

  /** Whether the context-injection hook should emit a briefing. */
  contextInjectionEnabled(): boolean {
    return this.get("contextInjection") !== "off";
  }

  /** A new `Settings` with `patch` applied; an `undefined` value clears a setting. */
  with(patch: SettingsPatch): Settings {
    return this.layer("override", patch);
  }

  configFilePath(): string {
    return path.join(this.baseDir, CONFIG_FILE);
  }

  /** All resolved values. */
  snapshot(): SettingsSnapshot {
    const out: Record<string, string> = {};
    for (const key of SETTING_KEYS) {
      const value = this.get(key);
      if (value !== undefined) out[key] = value;
    }
    return Object.freeze(out) as SettingsSnapshot;
  }

  toJSON(): SettingsSnapshot {
    return this.snapshot();
  }

  /**
   * Persist the settings to `<baseDir>/config.json`. Writes atomically at
   * mode 0600, like the session store.
   */
  async save(): Promise<string> {
    const target = this.configFilePath();
    const payload: Record<string, string> = {};
    for (const key of SETTING_KEYS) {
      const entry = this.entries.get(key);
      if (!entry || entry.source === "default") continue;
      payload[key] = entry.value;
    }
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(payload, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporary, target);
    return target;
  }

  private layer(source: SettingsSource, values: SettingsPatch): Settings {
    const next = new Map(this.entries);
    for (const key of SETTING_KEYS) {
      if (!Object.hasOwn(values, key)) continue;
      const raw = values[key];
      if (raw === undefined) {
        next.delete(key);
        continue;
      }
      next.set(key, { value: validate(key, raw, source), source });
    }
    return new Settings(this.baseDir, next);
  }
}

function validate(key: SettingKey, raw: string, source: SettingsSource): string {
  const descriptor = descriptorOf(key);
  try {
    return descriptor.parse(raw);
  } catch (error) {
    const detail = error instanceof z.ZodError ? (error.issues[0]?.message ?? "invalid") : "invalid";
    throw new SettingsError(`invalid ${source} value for ${key} (${descriptor.supply}): ${detail}`);
  }
}

async function readConfigFile(filePath: string): Promise<SettingsPatch> {
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SettingsError(`config file is not valid JSON: ${filePath}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new SettingsError(`config file must contain a JSON object: ${filePath}`);
  }

  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!isSettingKey(key)) {
      throw new SettingsError(`unknown setting "${key}" in ${filePath}`);
    }
    if (typeof value !== "string") {
      throw new SettingsError(`setting "${key}" in ${filePath} must be a string`);
    }
    values[key] = value;
  }
  return values;
}
