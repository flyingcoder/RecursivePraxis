import { createHash } from "node:crypto";
import type {
  ModelHost,
  ModelStepInput,
  ModelStepOutput,
  RoutingEvidence,
} from "../engine/orchestrator.js";

/**
 * Provider SDKs belong only behind this adapter boundary. These thin stubs
 * intentionally fail closed until applications inject configured transports.
 */
export interface JsonModelTransport {
  invoke(request: Readonly<Record<string, unknown>>): Promise<unknown>;
}

abstract class TransportModelHost implements ModelHost {
  abstract readonly id: string;
  abstract readonly version: string;
  private readonly transport?: JsonModelTransport | undefined;

  constructor(transport?: JsonModelTransport) {
    this.transport = transport;
  }

  async route(objective: string): Promise<RoutingEvidence> {
    if (!this.transport) throw new Error(`${this.id} adapter is not configured`);
    const value = await this.transport.invoke({ operation: "route", objective });
    return value as RoutingEvidence;
  }

  async execute(input: ModelStepInput): Promise<ModelStepOutput> {
    if (!this.transport) throw new Error(`${this.id} adapter is not configured`);
    const value = await this.transport.invoke({ operation: "execute", input });
    return value as ModelStepOutput;
  }
}

export class AnthropicClaudeHost extends TransportModelHost {
  readonly id = "anthropic-claude";
  readonly version = "adapter-stub-1";
}

export class CursorModelHost extends TransportModelHost {
  readonly id = "cursor";
  readonly version = "adapter-stub-1";
}

export class ClaudeIdeModelHost extends TransportModelHost {
  readonly id = "claude-ide";
  readonly version = "adapter-stub-1";
}

export class DeterministicFakeModelHost implements ModelHost {
  readonly id = "deterministic-fake";
  readonly version = "1";

  async route(objective: string): Promise<RoutingEvidence> {
    const evidence = createHash("sha256").update(objective).digest("hex");
    return {
      uncertainty: objective.includes("?") ? 0.55 : 0.2,
      contradictionDetected: /\bcontradict|conflict\b/i.test(objective),
      unresolvedClaims: objective.includes("?") ? ["question-requires-grounding"] : [],
      evidenceRefs: [{ id: "input-1", kind: "input", hash: evidence }],
    };
  }

  async execute(input: ModelStepInput): Promise<ModelStepOutput> {
    const content = `${input.operator}: ${input.objective}`;
    const evidenceHash = createHash("sha256").update(content).digest("hex");
    return {
      summary: content,
      evidenceRefs: [{ id: `${input.operator}-fake`, kind: "validator", hash: evidenceHash }],
      artifacts: [{ mediaType: "text/plain", content }],
      usage: { tokens: Math.min(64, input.maxTokens), costUsd: 0, latencyMs: 1 },
      validatorPassed: true,
      uncertainty: 0.1,
    };
  }
}
