import {
  MODEL_HOST_IDS,
  SettingsError,
  modelKeyForHost,
  type ModelHostId,
  type Settings,
  type SettingsPatch,
} from "../config/settings.js";

export const CONFIG_FLAG_USAGE =
  `usage: lambda init [--host ${MODEL_HOST_IDS.join("|")}] [--model <name>] [--ollama-url <url>]`;

export interface RawConfigFlags {
  readonly host?: string | undefined;
  readonly model?: string | undefined;
  readonly ollamaUrl?: string | undefined;
}

export type ParsedConfigFlags =
  | { ok: true; patch: SettingsPatch; changed: boolean }
  | { ok: false; error: string };

function isHostId(value: string): value is ModelHostId {
  return (MODEL_HOST_IDS as readonly string[]).includes(value);
}

/**
 * Turns the config flags accepted by `lambda init` into a settings patch.
 *
 * `--model` targets whichever host is in effect — the one named by `--host`
 * when present, otherwise the currently configured host — so an operator
 * never has to know the per-provider setting key. Validation is delegated to
 * `Settings.with`, keeping one definition of what a legal value is.
 */
export function parseConfigFlags(raw: RawConfigFlags, current: Settings): ParsedConfigFlags {
  const patch: Record<string, string> = {};

  if (raw.host !== undefined) {
    const host = raw.host.trim();
    if (!isHostId(host)) {
      return {
        ok: false,
        error: `unknown host: ${raw.host} (expected ${MODEL_HOST_IDS.join(", ")})`,
      };
    }
    patch.defaultHost = host;
  }

  if (raw.ollamaUrl !== undefined) {
    patch.ollamaBaseUrl = raw.ollamaUrl;
  }

  if (raw.model !== undefined) {
    const host = (patch.defaultHost as ModelHostId | undefined) ?? current.host();
    const modelKey = modelKeyForHost(host);
    if (modelKey === undefined) {
      return {
        ok: false,
        error: `--model does not apply to the "${host}" host, which takes no model name.`,
      };
    }
    patch[modelKey] = raw.model;
  }

  try {
    current.with(patch as SettingsPatch);
  } catch (error) {
    if (error instanceof SettingsError) return { ok: false, error: error.message };
    throw error;
  }

  return { ok: true, patch: patch as SettingsPatch, changed: Object.keys(patch).length > 0 };
}
