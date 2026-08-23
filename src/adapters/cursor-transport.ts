import { Agent } from "@cursor/sdk";
import type {
  ModelHost,
  ModelStepInput,
  ModelStepOutput,
  RoutingEvidence,
} from "../engine/orchestrator.js";
import { CursorModelHost, type JsonModelTransport } from "./model-hosts.js";
import { routingSchema, stepOutputSchema, toPlainJsonSchema } from "./schemas.js";
import { Settings } from "../config/settings.js";

export interface CursorTransportConfig {
  readonly apiKey: string;
  readonly model: string;
}

/**
 * Real transport: runs a single-turn Cursor agent per call. The Cursor SDK
 * has no native structured-output constraint, so the schema is embedded in
 * the prompt and the reply is parsed and validated with zod. Fails closed
 * (throws) on missing config, a non-finished run, or a response that does
 * not validate against the required schema.
 */
export class CursorAgentTransport implements JsonModelTransport {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: CursorTransportConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async invoke(request: Readonly<Record<string, unknown>>): Promise<unknown> {
    if (request.operation === "route") {
      return this.route(request.objective as string);
    }
    if (request.operation === "execute") {
      return this.execute(request.input as ModelStepInput);
    }
    throw new Error(`unsupported cursor transport operation: ${String(request.operation)}`);
  }

  private async route(objective: string): Promise<RoutingEvidence> {
    const text = await this.runPrompt(
      "You triage a task objective for a typed reasoning runtime. Report uncertainty, " +
        "contradiction, and unresolved claims honestly. Do not fabricate evidence.\n\n" +
        `Objective: ${objective}\n\n` +
        this.structuredReplyInstruction(routingSchema),
    );
    return routingSchema.parse(parseJsonReply(text));
  }

  private async execute(input: ModelStepInput): Promise<ModelStepOutput> {
    const text = await this.runPrompt(
      `You are executing operator "${input.operator}" from the RecursivePraxis operator alphabet ` +
        "against a budgeted, capability-gated task runtime. Produce a structured, evidenced " +
        "step output. Never assert evidence you did not derive from the given references.\n\n" +
        `${JSON.stringify({
          objective: input.objective,
          operator: input.operator,
          evidenceRefs: input.evidenceRefs,
        })}\n\n` +
        this.structuredReplyInstruction(stepOutputSchema),
    );
    return stepOutputSchema.parse(parseJsonReply(text));
  }

  private structuredReplyInstruction(schema: Parameters<typeof toPlainJsonSchema>[0]): string {
    return (
      "Reply with a single JSON object matching this JSON Schema and nothing else " +
      "— no prose, no markdown fences:\n" +
      JSON.stringify(toPlainJsonSchema(schema))
    );
  }

  private async runPrompt(message: string): Promise<string> {
    const result = await Agent.prompt(message, {
      apiKey: this.apiKey,
      model: { id: this.model },
      tools: [],
    });
    if (result.status !== "finished") {
      throw new Error(
        `cursor agent run did not finish: ${result.status}` +
          (result.error ? ` (${result.error.message})` : ""),
      );
    }
    if (!result.result) throw new Error("cursor agent run returned no result text");
    return result.result;
  }
}

function parseJsonReply(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) {
      throw new Error("cursor agent reply did not contain a JSON object");
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

export function createCursorTransport(settings: Settings): CursorAgentTransport {
  return new CursorAgentTransport({
    apiKey: settings.require("cursorApiKey"),
    model: settings.require("cursorModel"),
  });
}

export function createCursorHost(settings: Settings): ModelHost {
  return new CursorModelHost(createCursorTransport(settings));
}
