import { z } from "zod";

/**
 * Structured-output contract for a translator model's instruction bindings
 * (`src/ir/execution.ts`). A malformed response throws via `.parse` rather
 * than silently propagating.
 */

export const evidenceRefSchema = z.object({
  id: z.string(),
  kind: z.enum([
    "input",
    "validator",
    "tool-result",
    "test",
    "human-acceptance",
    "domain-check",
  ]),
  hash: z.string(),
});

/**
 * The model-authored half of a `CognitiveInstruction` (src/ir/execution.ts).
 * Every other field on an instruction is kernel-computed from
 * src/assets/formalism.json; a translator model may fill only these three.
 *
 * `evidenceRefs` is `.min(1)` on purpose: a binding that cites no span of the
 * human input is rejected rather than accepted as plausible prose. Without it,
 * "Crux — core pivot" degrades into "identify the key tension" for every input
 * ever submitted.
 */
export const instructionBindingSchema = z.object({
  domainBinding: z.string().min(1),
  evidenceRefs: z.array(evidenceRefSchema).min(1),
  exitTest: z.string().min(1),
});

export type InstructionBinding = z.infer<typeof instructionBindingSchema>;

/** Instruction index (as a string key) → binding, as returned by a translator. */
export const instructionBindingMapSchema = z.record(z.string(), instructionBindingSchema);
