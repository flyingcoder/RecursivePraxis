import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

/**
 * Runtime configuration for the RecursivePraxis CLI.
 *
 * There are exactly two ways a setting is supplied:
 *
 *   - **init-scoped** settings (host, model names, endpoints) are chosen once
 *     at install time by `lambda init` and persisted to
 *     `<baseDir>/config.json`. They are not read from the environment, so a
 *     stray shell variable can never silently re-point the runtime.
 *   - **secret** settings (API keys) come from the environment only and are
 *     never written to disk.
 *
 * Precedence within each scope: built-in default < config file (init-scoped)
 * / environment (secrets) < explicit override. Values are validated on
 * assignment, and `require` fails closed naming the exact way to supply the
 * missing value.
 *
 * Instances are immutable — `with` returns a new `Settings`.
 */

export const CONFIG_FILE = "config.json";
export const DEFAULT_SESSION_DIR = ".recursive-praxis";
export const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
export const DEFAULT_OLLAMA_MODEL = "llama3.2";

const REDACTED = "[redacted]";

export type SettingsSource = "default" | "file" | "env" | "override";

const nonEmpty = z.string().trim().min(1);
const hostSchema = z.enum(["ollama", "fake", "anthropic", "cursor", "claude-ide"]);
const urlSchema = z.url();

export const MODEL_HOST_IDS = hostSchema.options;
export type ModelHostId = z.infer<typeof hostSchema>;

interface SettingDescriptor {
  /**
   * `init` — persisted to the config file by `lambda init`, never read from
   * the environment. `secret` — read from the environment only, never
   * persisted.
   */
  readonly scope: "init" | "secret";
  /** How an operator supplies this setting; quoted verbatim in errors. */
  readonly supply: string;
  readonly defaultValue?: string;
  readonly parse: (raw: string) => string;
}

const DESCRIPTORS = {
  defaultHost: {
    scope: "init",
    supply: "lambda init --host <id>",
    defaultValue: "ollama",
    parse: (raw) => hostSchema.parse(raw.trim()),
  },
  ollamaBaseUrl: {
    scope: "init",
    supply: "lambda init --ollama-url <url>",
    defaultValue: DEFAULT_OLLAMA_URL,
    parse: (raw) => urlSchema.parse(raw.trim()).replace(/\/+$/, ""),
  },
  ollamaModel: {
    scope: "init",
    supply: "lambda init --host ollama --model <name>",
    defaultValue: DEFAULT_OLLAMA_MODEL,
    parse: (raw) => nonEmpty.parse(raw),
  },
  anthropicModel: {
    scope: "init",
    supply: "lambda init --host anthropic --model <name>",
    parse: (raw) => nonEmpty.parse(raw),
  },
  cursorModel: {
    scope: "init",
    supply: "lambda init --host cursor --model <name>",
    parse: (raw) => nonEmpty.parse(raw),
  },
  claudeIdeModel: {
    scope: "init",
    supply: "lambda init --host claude-ide --model <name>",
    parse: (raw) => nonEmpty.parse(raw),
  },
  anthropicApiKey: {
    scope: "secret",
    supply: "ANTHROPIC_API_KEY",
    parse: (raw) => nonEmpty.parse(raw),
  },
  cursorApiKey: {
    scope: "secret",
    supply: "CURSOR_API_KEY",
    parse: (raw) => nonEmpty.parse(raw),
  },
} as const satisfies Record<string, SettingDescriptor>;

export type SettingKey = keyof typeof DESCRIPTORS;

export const SETTING_KEYS = Object.keys(DESCRIPTORS).sort() as readonly SettingKey[];

export const INIT_SETTING_KEYS = SETTING_KEYS.filter((key) => DESCRIPTORS[key].scope === "init");

/** The model setting each host reads, so `--model` can target the active host. */
const HOST_MODEL_KEY = {
  ollama: "ollamaModel",
  anthropic: "anthropicModel",
  cursor: "cursorModel",
  "claude-ide": "claudeIdeModel",
  fake: undefined,
} as const satisfies Record<ModelHostId, SettingKey | undefined>;

/** `undefined` for the deterministic fake host, which takes no model name. */
export function modelKeyForHost(host: ModelHostId): SettingKey | undefined {
  return HOST_MODEL_KEY[host];
}

export type SettingsSnapshot = { readonly [K in SettingKey]?: string };
export type SettingsPatch = { readonly [K in SettingKey]?: string | undefined };

export interface SettingsLoadOptions {
  readonly cwd?: string;
  /** Defaults to `<cwd>/.recursive-praxis`. */
  readonly baseDir?: string;
  readonly env?: NodeJS.ProcessEnv;
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

  /** Built-in defaults only — no config file, no environment. */
  static defaults(cwd: string = process.cwd(), baseDir?: string): Settings {
    const entries = new Map<SettingKey, Entry>();
    for (const key of SETTING_KEYS) {
      const value = descriptorOf(key).defaultValue;
      if (value !== undefined) entries.set(key, { value, source: "default" });
    }
    return new Settings(path.resolve(cwd, baseDir ?? DEFAULT_SESSION_DIR), entries);
  }

  /**
   * Defaults, then the init-scoped config file, then secrets from the
   * environment, then explicit overrides. A missing config file is not an
   * error — it means the runtime is still on its defaults (local Ollama).
   */
  static async load(options: SettingsLoadOptions = {}): Promise<Settings> {
    const base = Settings.defaults(options.cwd ?? process.cwd(), options.baseDir);
    const fileValues = await readConfigFile(base.configFilePath());
    return base
      .layer("file", fileValues)
      .layer("env", readSecretsFromEnv(options.env ?? process.env))
      .layer("override", options.overrides ?? {});
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
      throw new SettingsError(
        descriptor.scope === "secret"
          ? `${descriptor.supply} is not configured`
          : `${key} is not configured — run: ${descriptor.supply}`,
      );
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

  /** The configured default model host. */
  host(): ModelHostId {
    return this.require("defaultHost") as ModelHostId;
  }

  /** A new `Settings` with `patch` applied; an `undefined` value clears a setting. */
  with(patch: SettingsPatch): Settings {
    return this.layer("override", patch);
  }

  configFilePath(): string {
    return path.join(this.baseDir, CONFIG_FILE);
  }

  /** All resolved values, secrets included. Use `toJSON` for anything logged. */
  snapshot(): SettingsSnapshot {
    const out: Record<string, string> = {};
    for (const key of SETTING_KEYS) {
      const value = this.get(key);
      if (value !== undefined) out[key] = value;
    }
    return Object.freeze(out) as SettingsSnapshot;
  }

  /** Serialization safe to log or print: secret values are replaced. */
  toJSON(): SettingsSnapshot {
    const out: Record<string, string> = {};
    for (const key of SETTING_KEYS) {
      const value = this.get(key);
      if (value === undefined) continue;
      out[key] = descriptorOf(key).scope === "secret" ? REDACTED : value;
    }
    return Object.freeze(out) as SettingsSnapshot;
  }

  /**
   * Persist the init-scoped settings to `<baseDir>/config.json`. Secrets stay
   * in the environment and are never written. Writes atomically at mode 0600,
   * like the session store.
   */
  async save(): Promise<string> {
    const target = this.configFilePath();
    const payload: Record<string, string> = {};
    for (const key of INIT_SETTING_KEYS) {
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

/** Only secrets are environment-sourced; init-scoped settings never are. */
function readSecretsFromEnv(env: NodeJS.ProcessEnv): SettingsPatch {
  const values: Record<string, string> = {};
  for (const key of SETTING_KEYS) {
    const descriptor = descriptorOf(key);
    if (descriptor.scope !== "secret") continue;
    const raw = env[descriptor.supply];
    if (raw === undefined || raw.trim() === "") continue;
    values[key] = raw;
  }
  return values;
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
    const descriptor = descriptorOf(key);
    if (descriptor.scope === "secret") {
      throw new SettingsError(
        `secret setting "${key}" must not be stored in ${filePath} — set ${descriptor.supply} in the environment`,
      );
    }
    if (typeof value !== "string") {
      throw new SettingsError(`setting "${key}" in ${filePath} must be a string`);
    }
    values[key] = value;
  }
  return values;
}
