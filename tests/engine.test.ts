import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "vitest";
import { DeterministicFakeModelHost } from "../dist/adapters/model-hosts.js";
import {
  AUTHORED_DEFAULT_BUDGET,
  OPERATOR_PACK,
  TRUSTED_POLICY,
  createTaskState,
  planTask,
  type PolicyProfile,
} from "../dist/engine/core.js";
import {
  CAPABILITY_BENCHMARK,
  promoteExperimentalPolicy,
  runCapabilityBenchmark,
} from "../dist/engine/evaluation.js";
import {
  FileTraceRepository,
  runTask,
  verifyReplay,
  type ModelHost,
} from "../dist/engine/orchestrator.js";

test("operator pack contains twenty versioned typed contracts", () => {
  assert.equal(OPERATOR_PACK.length, 20);
  assert.ok(OPERATOR_PACK.every((spec) => spec.version === "1.0.0"));
  assert.ok(OPERATOR_PACK.every((spec) => spec.prior.provenance === "authored"));
});

test("planner is deterministic for identical observable state", () => {
  const request = {
    state: createTaskState("Fix the parser"),
    capabilities: ["model", "read", "shell"] as const,
    privacy: "metadata-only" as const,
    policy: TRUSTED_POLICY,
  };
  assert.deepEqual(planTask(request), planTask(request));
});

test("planner rejects plans exceeding hard budget", () => {
  const state = createTaskState("Fix the parser", {
    budget: { ...AUTHORED_DEFAULT_BUDGET, maxTokens: 1 },
  });
  assert.throws(
    () =>
      planTask({
        state,
        capabilities: ["model", "read"],
        privacy: "metadata-only",
        policy: TRUSTED_POLICY,
      }),
    /no valid plan within/,
  );
});

test("planner enforces capability grants before ranking outcome", () => {
  const state = createTaskState("Fix failed checks", { failedChecks: ["test"] });
  const plan = planTask({
    state,
    capabilities: ["model"],
    privacy: "metadata-only",
    policy: TRUSTED_POLICY,
  });
  assert.ok(plan.steps.every((step) => step.requiredCapabilities.includes("model")));
  assert.ok(plan.steps.every((step) => !step.requiredCapabilities.includes("read")));
});

test("trace is redacted, atomic, and replay integrity is reproducible", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "praxis-trace-"));
  try {
    const objective = "Do not persist this raw objective";
    const trace = await runTask({
      state: createTaskState(objective),
      capabilities: ["model", "read", "shell"],
      privacy: "metadata-only",
      policy: TRUSTED_POLICY,
      modelHost: new DeterministicFakeModelHost(),
    });
    assert.equal(trace.rawContentIncluded, false);
    assert.doesNotMatch(JSON.stringify(trace), new RegExp(objective));
    const repository = new FileTraceRepository(directory);
    await repository.save(trace);
    const loaded = await repository.load(trace.taskId);
    assert.equal(verifyReplay(loaded).reproducible, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("execution denies tools outside an operator allowlist", async () => {
  const host: ModelHost = {
    id: "tool-requester",
    version: "1",
    async execute(input) {
      return {
        summary: "request",
        evidenceRefs: [],
        artifacts: [],
        usage: { tokens: 1, costUsd: 0, latencyMs: 1 },
        validatorPassed: true,
        uncertainty: 0,
        requestedTools: [
          { name: "write", capability: "write", args: { path: "safe.txt" }, timeoutMs: 100 },
        ],
      };
    },
  };
  await assert.rejects(
    runTask({
      state: createTaskState("Simple task"),
      capabilities: ["model", "write"],
      privacy: "metadata-only",
      policy: TRUSTED_POLICY,
      modelHost: host,
      toolHost: {
        id: "must-not-run",
        async call() {
          throw new Error("unexpected tool execution");
        },
      },
    }),
    /tool denied/,
  );
});

test("validator failure causes one conditional deterministic replan", async () => {
  let calls = 0;
  const host: ModelHost = {
    id: "replanning-fake",
    version: "1",
    async execute(input) {
      calls += 1;
      return {
        summary: input.operator,
        evidenceRefs: [],
        artifacts: [],
        usage: { tokens: 1, costUsd: 0, latencyMs: 1 },
        validatorPassed: calls !== 1,
        uncertainty: 0,
      };
    },
  };
  const trace = await runTask({
    state: createTaskState("Repair a check"),
    capabilities: ["model"],
    privacy: "metadata-only",
    policy: TRUSTED_POLICY,
    modelHost: host,
  });
  assert.equal(
    trace.events.filter((event) => event.type === "decision" && event.action === "replan").length,
    1,
  );
  assert.equal(trace.events.filter((event) => event.type === "planned").length, 2);
});

test("benchmark spans three domains and promotion requires grounded passes", async () => {
  assert.deepEqual(
    new Set(CAPABILITY_BENCHMARK.map((item) => item.domain)),
    new Set(["software-engineering", "research-synthesis", "general-reasoning"]),
  );
  const experimental: PolicyProfile = {
    name: "experimental",
    version: "experiment-1",
    utilityAdjustments: {},
    provenance: "inferred",
  };
  const result = await runCapabilityBenchmark(
    new DeterministicFakeModelHost(),
    experimental,
  );
  const promoted = promoteExperimentalPolicy(experimental, result);
  assert.equal(promoted.policy.name, "trusted");
  assert.equal(promoted.policy.provenance, "grounded");
  assert.equal(promoted.record.groundedEvidence.length, 3);
  assert.throws(
    () =>
      promoteExperimentalPolicy(experimental, {
        ...result,
        groundedPassRate: 2 / 3,
      }),
    /grounded evidence/,
  );
});
