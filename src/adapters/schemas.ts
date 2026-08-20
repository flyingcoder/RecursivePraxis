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

/** Strips the `$schema` field zod's JSON Schema output carries, which most
 * provider SDKs reject on a tool/output-format definition. */
export function toPlainJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const { $schema, ...rest } = z.toJSONSchema(schema) as Record<string, unknown> & {
    $schema?: unknown;
  };
  return rest;
}
