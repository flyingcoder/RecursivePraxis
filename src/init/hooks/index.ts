import type { Hook } from "../assets/DataAsset.js";
import legalityGate from "./legality-gate.js";
import contextInjection from "./context-injection.js";

/**
 * Shell commands bound to host events.
 *
 * To add one: create `src/init/hooks/<slug>.ts` with a default export (see
 * `legality-gate.ts` for the shape) and list it here.
 *
 * Every hook in this list collapses into a single `hooks/hooks.json` per host,
 * grouped by event. Unlike prose, that file has nowhere to carry the managed
 * markers, so it is whole-file generated and compared by content — a hand-edit
 * is reported as drift rather than preserved.
 */
export const HOOKS: readonly Hook[] = [legalityGate, contextInjection];
