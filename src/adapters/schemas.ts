import { z } from "zod";

/**
 * Shared structured-output contract for every model transport. Each adapter
 * forces the underlying provider to return JSON matching one of these
 * shapes, then validates with `.parse` so a malformed response throws
 * instead of silently propagating.
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

export const toolCallSchema = z.object({
  name: z.string(),
  capability: z.enum(["read", "write", "shell", "network"]),
  args: z.record(z.string(), z.unknown()),
  timeoutMs: z.number(),
});

export const stepOutputSchema = z.object({
  summary: z.string(),
  evidenceRefs: z.array(evidenceRefSchema),
  artifacts: z.array(z.object({ mediaType: z.string(), content: z.string() })),
  usage: z.object({ tokens: z.number(), costUsd: z.number(), latencyMs: z.number() }),
  validatorPassed: z.boolean(),
  uncertainty: z.number(),
  requestedTools: z.array(toolCallSchema).optional(),
});

export const routingSchema = z.object({
  uncertainty: z.number(),
  contradictionDetected: z.boolean(),
  unresolvedClaims: z.array(z.string()),
  evidenceRefs: z.array(evidenceRefSchema),
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

/** Strips the `$schema` field zod's JSON Schema output carries, which most
 * provider SDKs reject on a tool/output-format definition. */
export function toPlainJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const { $schema, ...rest } = z.toJSONSchema(schema) as Record<string, unknown> & {
    $schema?: unknown;
  };
  return rest;
}
