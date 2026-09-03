import type { Rule } from "../assets/ProseAsset.js";
import noInventedMeasurement from "./no-invented-measurement.js";

/**
 * Always-on context a host loads without being asked.
 *
 * To add one: create `src/init/rules/<slug>.ts` with a default export and list
 * it here.
 *
 *   import { Rule } from "../assets/ProseAsset.js";
 *
 *   export default new Rule({
 *     slug: "kernel-authority",
 *     title: "RecursivePraxis: kernel authority",
 *     description: "`lambda` output outranks the model's narrated sense of session state.",
 *     body: `…markdown…`,
 *   });
 *
 * Rules are not invocable — nothing types a rule's name — so `{{invoke:<slug>}}`
 * may not target one. Reference a skill or command instead.
 */
export const RULES: readonly Rule[] = [noInventedMeasurement];
