import {
  CONTEXT_INJECTION_VALUES,
  SettingsError,
  type Settings,
  type SettingsPatch,
} from "../config/settings.js";

export const CONFIG_FLAG_USAGE =
  `usage: lambda init [--context-injection ${CONTEXT_INJECTION_VALUES.join("|")}]`;

export interface RawConfigFlags {
  readonly contextInjection?: string | undefined;
}

export type ParsedConfigFlags =
  | { ok: true; patch: SettingsPatch; changed: boolean }
  | { ok: false; error: string };

/**
 * Turns the config flags accepted by `lambda init` into a settings patch.
 *
 * Validation is delegated to `Settings.with`, keeping one definition of what a
 * legal value is.
 */
export function parseConfigFlags(raw: RawConfigFlags, current: Settings): ParsedConfigFlags {
  const patch: Record<string, string> = {};

  if (raw.contextInjection !== undefined) {
    patch.contextInjection = raw.contextInjection.trim();
  }

  try {
    current.with(patch as SettingsPatch);
  } catch (error) {
    if (error instanceof SettingsError) return { ok: false, error: error.message };
    throw error;
  }

  return { ok: true, patch: patch as SettingsPatch, changed: Object.keys(patch).length > 0 };
}
