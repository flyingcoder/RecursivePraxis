import { HOST_IDS, isHostId, type HostId } from "./types.js";

export type ParsedTools = { ok: true; tools: readonly HostId[] } | { ok: false; error: string };

const USAGE = `usage: lambda init --tools ${HOST_IDS.join(",")} | all | none`;

/**
 * Parses the raw value passed to `--tools` (e.g. "claude,cursor", "all", "none").
 * Does not handle the "flag omitted entirely" case — callers must check for
 * that before calling this, since it fails differently (no usage fallback,
 * an explicit instruction to pass --tools).
 *
 * `all` stays literal — every registered host, detected or not — because
 * scripts and CI depend on it meaning the same thing on every machine. It is
 * the *wizard* whose default is the detected set; a flag that changed meaning
 * with the machine it ran on would be worse than one that writes a file for a
 * host you have not installed yet.
 */
export function parseToolsValue(raw: string): ParsedTools {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: `--tools value must not be empty. ${USAGE}` };
  }

  const tokens = trimmed
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.includes("all") || tokens.includes("none")) {
    if (tokens.length > 1) {
      return {
        ok: false,
        error: `"all" and "none" cannot be combined with other tools or each other. ${USAGE}`,
      };
    }
    return tokens[0] === "all" ? { ok: true, tools: HOST_IDS } : { ok: true, tools: [] };
  }

  const unknown = tokens.filter((token) => !isHostId(token));
  if (unknown.length > 0) {
    return {
      ok: false,
      error: `unknown tool${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")} (expected ${HOST_IDS.join(", ")}, all, or none)`,
    };
  }

  const seen = new Set<HostId>();
  for (const token of tokens) {
    seen.add(token as HostId);
  }
  return { ok: true, tools: HOST_IDS.filter((id) => seen.has(id)) };
}

export const TOOLS_FLAG_USAGE = USAGE;
