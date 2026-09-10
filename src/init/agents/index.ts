import type { Agent } from "../assets/ProseAsset.js";

/**
 * Delegated sub-agent definitions.
 *
 * To add one: create `src/init/agents/<slug>.ts` with a default export and
 * list it here.
 *
 *   import { Agent } from "../assets/ProseAsset.js";
 *
 *   export default new Agent({
 *     slug: "operator-auditor",
 *     title: "RecursivePraxis: operator auditor",
 *     description: "Checks a proposed operator sequence against `lambda check` before it is applied.",
 *     body: `…markdown…`,
 *   });
 *
 * Only hosts whose layout places `agent` files receive these; the rest skip
 * them silently, which is what lets a kind exist before every host supports it.
 */
export const AGENTS: readonly Agent[] = [];
