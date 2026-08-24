import type { HostContext } from "./context.js";

/**
 * Detection evidence and the single confidence ladder that ranks it.
 *
 * The split matters: a host adapter contributes *signals* and nothing else,
 * and this module alone turns signals into a verdict. That is why `probes`
 * is protected on `HostAdapter` — with per-host ranking, two hosts could
 * disagree about what "installed" means, and the Step 1 table would stop
 * being comparable across rows.
 */

export type SignalKind = "env" | "project" | "binary" | "config";

export interface HostSignal {
  readonly kind: SignalKind;
  /** What was actually observed, printed verbatim as evidence. */
  readonly detail: string;
  /**
   * True for signals that are observed rather than contracted — env markers
   * set by a host that happens to be running us. These may pre-check a box;
   * they must never justify a write on their own.
   */
  readonly heuristic: boolean;
}

export type Confidence = "running-here" | "active-here" | "installed" | "configured" | "absent";

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  "running-here": "running here",
  "active-here": "active here",
  installed: "installed",
  configured: "configured",
  absent: "not found",
};

export function envSignal(ctx: HostContext, name: string): HostSignal | undefined {
  const value = ctx.env[name];
  if (value === undefined || value.length === 0) return undefined;
  return { kind: "env", detail: `${name}=${value} (heuristic)`, heuristic: true };
}

export function binarySignal(ctx: HostContext, binary: string): HostSignal | undefined {
  const resolved = ctx.onPath(binary);
  if (resolved === undefined) return undefined;
  return { kind: "binary", detail: resolved, heuristic: false };
}

export function configSignal(ctx: HostContext, absPath: string, display: string): HostSignal | undefined {
  if (!ctx.exists(absPath)) return undefined;
  return { kind: "config", detail: display, heuristic: false };
}

export function projectSignal(ctx: HostContext, absPath: string, display: string): HostSignal | undefined {
  if (!ctx.exists(absPath)) return undefined;
  return { kind: "project", detail: display, heuristic: false };
}

export function isPresent(signal: HostSignal | undefined): signal is HostSignal {
  return signal !== undefined;
}

function has(signals: readonly HostSignal[], kind: SignalKind): boolean {
  return signals.some((signal) => signal.kind === kind);
}

/**
 * The ladder, strongest first. `env` outranks everything because a host that
 * set a marker in our own process is demonstrably executing us right now;
 * a project-local config directory says this repository is already used with
 * the host; PATH says the host is on the machine; a user-level config
 * directory says it has been run at least once somewhere.
 */
export function rankConfidence(signals: readonly HostSignal[]): Confidence {
  if (has(signals, "env")) return "running-here";
  if (has(signals, "project")) return "active-here";
  if (has(signals, "binary")) return "installed";
  if (has(signals, "config")) return "configured";
  return "absent";
}

/**
 * Whether Step 2 starts with this host's box checked. Deliberately a function
 * of the whole signal set rather than of the ranked confidence: "installed
 * and configured" is a stronger claim than either alone, and collapsing to a
 * single rung first would throw away the half that is not the maximum.
 *
 * This chooses where the cursor starts. The human's Step 2 answer is final.
 */
export function autoSelects(signals: readonly HostSignal[]): boolean {
  if (has(signals, "env") || has(signals, "project")) return true;
  return has(signals, "binary") && has(signals, "config");
}
