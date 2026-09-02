import type { Hook } from "../assets/DataAsset.js";

/**
 * Shell commands bound to host events.
 *
 * To add one: create `src/init/hooks/<slug>.ts` with a default export and list
 * it here.
 *
 *   import { Hook } from "../assets/DataAsset.js";
 *
 *   export default new Hook({
 *     slug: "legality-gate",
 *     title: "RecursivePraxis: legality gate",
 *     description: "Refuses a tool call the kernel does not currently list in `legalNext`.",
 *     event: "PreToolUse",
 *     matcher: "Bash",
 *     command: "lambda ir --json",
 *   });
 *
 * Every hook in this list collapses into a single `hooks/hooks.json` per host,
 * grouped by event. Unlike prose, that file has nowhere to carry the managed
 * markers, so it is whole-file generated and compared by content — a hand-edit
 * is reported as drift rather than preserved.
 */
export const HOOKS: readonly Hook[] = [];
