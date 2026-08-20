import { query } from "@anthropic-ai/claude-agent-sdk";
import type {
  ModelHost,
  ModelStepInput,
  ModelStepOutput,
  RoutingEvidence,
} from "../engine/orchestrator.js";
import { ClaudeIdeModelHost, type JsonModelTransport } from "./model-hosts.js";
import { routingSchema, stepOutputSchema, toPlainJsonSchema } from "./schemas.js";

export interface ClaudeIdeTransportConfig {
  readonly model: string;
}

/**
 * Real transport: drives the Claude Agent SDK (the Claude Code harness, as
 * used by the Claude Code IDE integrations) for a single-turn structured
 * request per call. Built-in tools are disabled since this transport only
 * needs a validated JSON reply. Credentials are resolved by the underlying
 * `claude` CLI subprocess (env var, OAuth profile, etc.), not by this
 * adapter. Fails closed (throws) on missing config, a non-success result,
 * or a reply that does not validate against the required schema.
 */
export class ClaudeIdeTransport implements JsonModelTransport {
  private readonly model: string;

  constructor(config: ClaudeIdeTransportConfig) {
    this.model = config.model;
  }

  async invoke(request: Readonly<Record<string, unknown>>): Promise<unknown> {
    if (request.operation === "route") {
      return this.route(request.objective as string);
    }
    if (request.operation === "execute") {
      return this.execute(request.input as ModelStepInput);
    }
    throw new Error(`unsupported claude-ide transport operation: ${String(request.operation)}`);
  }

  private async route(objective: string): Promise<RoutingEvidence> {
    const text = await this.runQuery(
      "You triage a task objective for a typed reasoning runtime. Report uncertainty, " +
        "contradiction, and unresolved claims honestly. Do not fabricate evidence.\n\n" +
        `Objective: ${objective}`,
      routingSchema,
    );
    return routingSchema.parse(JSON.parse(text));
  }

  private async execute(input: ModelStepInput): Promise<ModelStepOutput> {
    const text = await this.runQuery(
      `You are executing operator "${input.operator}" from the RecursivePraxis operator alphabet ` +
        "against a budgeted, capability-gated task runtime. Produce a structured, evidenced " +
        "step output. Never assert evidence you did not derive from the given references.\n\n" +
        JSON.stringify({
          objective: input.objective,
          operator: input.operator,
          evidenceRefs: input.evidenceRefs,
        }),
      stepOutputSchema,
    );
    return stepOutputSchema.parse(JSON.parse(text));
  }

  private async runQuery(
    prompt: string,
    schema: Parameters<typeof toPlainJsonSchema>[0],
  ): Promise<string> {
    const stream = query({
      prompt,
      options: {
        model: this.model,
        tools: [],
        maxTurns: 1,
        outputFormat: { type: "json_schema", schema: toPlainJsonSchema(schema) },
      },
    });
    for await (const message of stream) {
      if (message.type !== "result") continue;
      if (message.subtype !== "success") {
        throw new Error(`claude-ide run did not succeed: ${message.subtype}`);
      }
      return message.result;
    }
    throw new Error("claude-ide run ended without a result message");
  }
}

export function claudeIdeTransportFromEnv(): ClaudeIdeTransport {
  const model = process.env.CLAUDE_IDE_MODEL;
  if (!model) throw new Error("CLAUDE_IDE_MODEL is not configured");
  return new ClaudeIdeTransport({ model });
}

export function createClaudeIdeHostFromEnv(): ModelHost {
  return new ClaudeIdeModelHost(claudeIdeTransportFromEnv());
}
