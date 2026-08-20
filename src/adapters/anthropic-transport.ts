import Anthropic from "@anthropic-ai/sdk";
import type {
  ModelHost,
  ModelStepInput,
  ModelStepOutput,
  RoutingEvidence,
} from "../engine/orchestrator.js";
import { AnthropicClaudeHost, type JsonModelTransport } from "./model-hosts.js";
import { routingSchema, stepOutputSchema, toPlainJsonSchema } from "./schemas.js";

const STEP_TOOL_NAME = "emit_step_output";
const ROUTING_TOOL_NAME = "emit_routing_evidence";

export interface AnthropicTransportConfig {
  readonly apiKey: string;
  readonly model: string;
}

/**
 * Real transport: calls the Anthropic Messages API and forces a structured
 * tool call so the response satisfies ModelStepOutput / RoutingEvidence.
 * Fails closed (throws) on missing config, malformed output, or a model
 * response that skips the required tool call.
 */
export class AnthropicMessagesTransport implements JsonModelTransport {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(config: AnthropicTransportConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async invoke(request: Readonly<Record<string, unknown>>): Promise<unknown> {
    if (request.operation === "route") {
      return this.route(request.objective as string);
    }
    if (request.operation === "execute") {
      return this.execute(request.input as ModelStepInput);
    }
    throw new Error(`unsupported anthropic transport operation: ${String(request.operation)}`);
  }

  private async route(objective: string): Promise<RoutingEvidence> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      system:
        "You triage a task objective for a typed reasoning runtime. Report uncertainty, " +
        "contradiction, and unresolved claims honestly. Do not fabricate evidence.",
      messages: [{ role: "user", content: objective }],
      tools: [
        {
          name: ROUTING_TOOL_NAME,
          description: "Report routing evidence for the objective.",
          input_schema: toPlainJsonSchema(routingSchema) as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: ROUTING_TOOL_NAME },
    });
    return routingSchema.parse(extractToolInput(message, ROUTING_TOOL_NAME));
  }

  private async execute(input: ModelStepInput): Promise<ModelStepOutput> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: Math.max(1, Math.min(input.maxTokens, 4_096)),
      system:
        `You are executing operator "${input.operator}" from the CORE reasoning alphabet ` +
        "against a budgeted, capability-gated task runtime. Produce a structured, evidenced " +
        "step output. Never assert evidence you did not derive from the given references.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            objective: input.objective,
            operator: input.operator,
            evidenceRefs: input.evidenceRefs,
          }),
        },
      ],
      tools: [
        {
          name: STEP_TOOL_NAME,
          description: "Report the structured result of this operator step.",
          input_schema: toPlainJsonSchema(stepOutputSchema) as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: STEP_TOOL_NAME },
    });
    return stepOutputSchema.parse(extractToolInput(message, STEP_TOOL_NAME));
  }
}

function extractToolInput(message: Anthropic.Message, toolName: string): unknown {
  const block = message.content.find(
    (item): item is Anthropic.ToolUseBlock =>
      item.type === "tool_use" && item.name === toolName,
  );
  if (!block) throw new Error(`model did not call required tool: ${toolName}`);
  return block.input;
}

export function anthropicTransportFromEnv(): AnthropicMessagesTransport {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  if (!model) throw new Error("ANTHROPIC_MODEL is not configured");
  return new AnthropicMessagesTransport({ apiKey, model });
}

export function createAnthropicHostFromEnv(): ModelHost {
  return new AnthropicClaudeHost(anthropicTransportFromEnv());
}
