import type {
  ModelHost,
  ModelStepInput,
  ModelStepOutput,
  RoutingEvidence,
} from "../engine/orchestrator.js";
import { OllamaModelHost, type JsonModelTransport } from "./model-hosts.js";
import { routingSchema, stepOutputSchema, toPlainJsonSchema } from "./schemas.js";
import type { Settings } from "../config/settings.js";

export interface OllamaTransportConfig {
  /** Base URL of the local Ollama server, without a trailing slash. */
  readonly baseUrl: string;
  readonly model: string;
  /** Hard ceiling on a single generation; a hung local server must not wedge a run. */
  readonly requestTimeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Default transport: talks to a locally running Ollama server over its HTTP
 * chat API. Structured output is enforced server-side by passing the JSON
 * Schema as `format`, and the reply is validated with zod anyway. Runs fully
 * offline — no API key, no credential, nothing leaves the machine.
 *
 * Fails closed (throws) when the server is unreachable, returns a non-2xx
 * status, or emits content that does not satisfy the required schema.
 */
export class OllamaTransport implements JsonModelTransport {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly requestTimeoutMs: number;

  constructor(config: OllamaTransportConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.model = config.model;
    this.requestTimeoutMs = config.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async invoke(request: Readonly<Record<string, unknown>>): Promise<unknown> {
    if (request.operation === "route") {
      return this.route(request.objective as string);
    }
    if (request.operation === "execute") {
      return this.execute(request.input as ModelStepInput);
    }
    throw new Error(`unsupported ollama transport operation: ${String(request.operation)}`);
  }

  private async route(objective: string): Promise<RoutingEvidence> {
    const text = await this.chat(
      "You triage a task objective for a typed reasoning runtime. Report uncertainty, " +
        "contradiction, and unresolved claims honestly. Do not fabricate evidence.",
      objective,
      routingSchema,
    );
    return routingSchema.parse(JSON.parse(text));
  }

  private async execute(input: ModelStepInput): Promise<ModelStepOutput> {
    const text = await this.chat(
      `You are executing operator "${input.operator}" from the RecursivePraxis operator alphabet ` +
        "against a budgeted, capability-gated task runtime. Produce a structured, evidenced " +
        "step output. Never assert evidence you did not derive from the given references.",
      JSON.stringify({
        objective: input.objective,
        operator: input.operator,
        evidenceRefs: input.evidenceRefs,
      }),
      stepOutputSchema,
      input.maxTokens,
    );
    return stepOutputSchema.parse(JSON.parse(text));
  }

  private async chat(
    system: string,
    user: string,
    schema: Parameters<typeof toPlainJsonSchema>[0],
    maxTokens?: number,
  ): Promise<string> {
    const body = {
      model: this.model,
      stream: false,
      format: toPlainJsonSchema(schema),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      options: {
        temperature: 0,
        ...(maxTokens === undefined ? {} : { num_predict: Math.max(1, maxTokens) }),
      },
    };

    const response = await this.post("/api/chat", body);
    const payload = (await response.json()) as { message?: { content?: string } };
    const content = payload.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      throw new Error("ollama returned no message content");
    }
    return content;
  }

  private async post(route: string, body: unknown): Promise<Response> {
    const url = `${this.baseUrl}${route}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch (error) {
      throw new Error(
        `cannot reach the local Ollama server at ${this.baseUrl} ` +
          `(${(error as Error).message}) — is \`ollama serve\` running?`,
      );
    }
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).trim();
      throw new Error(
        `ollama request failed: ${response.status} ${response.statusText}` +
          (detail ? ` — ${detail}` : "") +
          (response.status === 404 ? ` (is the model "${this.model}" pulled?)` : ""),
      );
    }
    return response;
  }
}

export function createOllamaTransport(settings: Settings): OllamaTransport {
  return new OllamaTransport({
    baseUrl: settings.require("ollamaBaseUrl"),
    model: settings.require("ollamaModel"),
  });
}

export function createOllamaHost(settings: Settings): ModelHost {
  return new OllamaModelHost(createOllamaTransport(settings));
}
