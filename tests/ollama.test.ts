import assert from "node:assert/strict";
import { afterEach, describe, it } from "vitest";
import { OllamaTransport, createOllamaHost } from "../src/adapters/ollama-transport.js";
import { Settings } from "../src/config/settings.js";
import type { ModelStepInput } from "../src/engine/orchestrator.js";

const ROUTING_REPLY = {
  uncertainty: 0.3,
  contradictionDetected: false,
  unresolvedClaims: [],
  evidenceRefs: [{ id: "input-1", kind: "input", hash: "abc" }],
};

const STEP_REPLY = {
  summary: "did the thing",
  evidenceRefs: [{ id: "step-1", kind: "validator", hash: "def" }],
  artifacts: [{ mediaType: "text/plain", content: "out" }],
  usage: { tokens: 12, costUsd: 0, latencyMs: 5 },
  validatorPassed: true,
  uncertainty: 0.1,
};

interface Call {
  readonly url: string;
  readonly body: Record<string, unknown>;
}

const realFetch = globalThis.fetch;

function stubFetch(handler: (call: Call) => Response): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    };
    calls.push(call);
    return handler(call);
  }) as typeof fetch;
  return calls;
}

function jsonReply(content: unknown): Response {
  return new Response(JSON.stringify({ message: { content: JSON.stringify(content) } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function transport(baseUrl = "http://127.0.0.1:11434"): OllamaTransport {
  return new OllamaTransport({ baseUrl, model: "llama3.2" });
}

const STEP_INPUT: ModelStepInput = {
  taskId: "task-1",
  objective: "summarize the trace",
  operator: "Ana",
  evidenceRefs: [],
  maxTokens: 256,
};

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("OllamaTransport", () => {
  it("routes against the local chat endpoint and validates the reply", async () => {
    const calls = stubFetch(() => jsonReply(ROUTING_REPLY));
    const result = await transport().invoke({ operation: "route", objective: "ship it" });

    assert.deepEqual(result, ROUTING_REPLY);
    assert.equal(calls[0]!.url, "http://127.0.0.1:11434/api/chat");
    assert.equal(calls[0]!.body.model, "llama3.2");
    assert.equal(calls[0]!.body.stream, false);
  });

  it("constrains generation with the JSON schema server-side", async () => {
    const calls = stubFetch(() => jsonReply(ROUTING_REPLY));
    await transport().invoke({ operation: "route", objective: "ship it" });

    const format = calls[0]!.body.format as Record<string, unknown>;
    assert.equal(format.type, "object");
    assert.equal(Object.hasOwn(format.properties as object, "uncertainty"), true);
  });

  it("passes the step budget through as num_predict", async () => {
    const calls = stubFetch(() => jsonReply(STEP_REPLY));
    const result = await transport().invoke({ operation: "execute", input: STEP_INPUT });

    assert.deepEqual(result, STEP_REPLY);
    assert.deepEqual(calls[0]!.body.options, { temperature: 0, num_predict: 256 });
  });

  it("normalizes a trailing slash in the base url", async () => {
    const calls = stubFetch(() => jsonReply(ROUTING_REPLY));
    await transport("http://127.0.0.1:11434/").invoke({ operation: "route", objective: "x" });
    assert.equal(calls[0]!.url, "http://127.0.0.1:11434/api/chat");
  });

  it("rejects an unsupported operation", async () => {
    stubFetch(() => jsonReply(ROUTING_REPLY));
    await assert.rejects(transport().invoke({ operation: "sing" }), /unsupported ollama transport/);
  });

  // --- fail-closed behavior -------------------------------------------------------

  it("explains how to start the server when it is unreachable", async () => {
    globalThis.fetch = (async () => {
      throw new Error("fetch failed");
    }) as typeof fetch;
    await assert.rejects(
      transport().invoke({ operation: "route", objective: "x" }),
      /cannot reach the local Ollama server at http:\/\/127\.0\.0\.1:11434.*ollama serve/s,
    );
  });

  it("points at a missing model pull on a 404", async () => {
    stubFetch(() => new Response("model not found", { status: 404, statusText: "Not Found" }));
    await assert.rejects(
      transport().invoke({ operation: "route", objective: "x" }),
      /is the model "llama3.2" pulled\?/,
    );
  });

  it("throws on a non-2xx status", async () => {
    stubFetch(() => new Response("boom", { status: 500, statusText: "Server Error" }));
    await assert.rejects(transport().invoke({ operation: "route", objective: "x" }), /500/);
  });

  it("throws when the server returns no content", async () => {
    stubFetch(() => new Response(JSON.stringify({ message: { content: "" } }), { status: 200 }));
    await assert.rejects(
      transport().invoke({ operation: "route", objective: "x" }),
      /no message content/,
    );
  });

  it("throws when the content does not satisfy the schema", async () => {
    stubFetch(() => jsonReply({ uncertainty: "very" }));
    await assert.rejects(transport().invoke({ operation: "route", objective: "x" }));
  });
});

describe("createOllamaHost", () => {
  it("builds a host from the configured defaults without any credential", async () => {
    const calls = stubFetch(() => jsonReply(STEP_REPLY));
    const host = createOllamaHost(Settings.defaults("/tmp/project"));

    assert.equal(host.id, "ollama");
    await host.execute(STEP_INPUT);
    assert.equal(calls[0]!.url, "http://127.0.0.1:11434/api/chat");
    assert.equal(calls[0]!.body.model, "llama3.2");
  });
});
