import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
  operatorContract,
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
import { applyOperator, classifyAttractor } from "../dist/kernel/index.js";

test("operator pack contains twenty versioned typed contracts", () => {
  assert.equal(OPERATOR_PACK.length, 20);
  assert.ok(OPERATOR_PACK.every((spec) => spec.version === "1.0.0"));
  assert.ok(OPERATOR_PACK.every((spec) => spec.prior.provenance === "authored"));
});

test("operatorContract resolves a known operator and throws on an unknown one", () => {
  const contract = operatorContract("Vale");
  assert.equal(contract.name, "Vale");
  assert.equal(contract.version, "1.0.0");
  assert.equal(contract.prior.provenance, "authored");
  // Vale is a tool-capable operator, so it carries a non-empty tool allowlist.
  assert.deepEqual([...contract.allowedTools], ["read", "fetch"]);

  assert.throws(
    () => operatorContract("NotAnOperator" as never),
    /unknown operator contract: NotAnOperator/,
  );
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

test("execution fails closed when a model reports usage beyond the remaining budget", async () => {
  const host: ModelHost = {
    id: "over-budget-host",
    version: "1",
    async execute() {
      return {
        summary: "overrun",
        evidenceRefs: [],
        artifacts: [],
        usage: { tokens: AUTHORED_DEFAULT_BUDGET.maxTokens + 1, costUsd: 0, latencyMs: 1 },
        validatorPassed: true,
        uncertainty: 0,
      };
    },
  };
  await assert.rejects(
    runTask({
      state: createTaskState("Bounded execution"),
      capabilities: ["model"],
      privacy: "metadata-only",
      policy: TRUSTED_POLICY,
      modelHost: host,
    }),
    /model budget exceeded/,
  );
});

test("execution rejects malformed evidence references from an untrusted model host", async () => {
  const host: ModelHost = {
    id: "malformed-evidence-host",
    version: "1",
    async execute() {
      return {
        summary: "bad evidence",
        evidenceRefs: [{ id: "missing-hash", kind: "validator", hash: "not-a-sha256" }],
        artifacts: [],
        usage: { tokens: 1, costUsd: 0, latencyMs: 1 },
        validatorPassed: true,
        uncertainty: 0,
      };
    },
  };
  await assert.rejects(
    runTask({
      state: createTaskState("Evidence integrity"),
      capabilities: ["model"],
      privacy: "metadata-only",
      policy: TRUSTED_POLICY,
      modelHost: host,
    }),
    /malformed model output/,
  );
});

test("routing is denied before it can consume an exhausted call budget", async () => {
  let routed = false;
  const host: ModelHost = {
    id: "router-host",
    version: "1",
    async route() {
      routed = true;
      return { uncertainty: 0, contradictionDetected: false, unresolvedClaims: [], evidenceRefs: [] };
    },
    async execute() {
      throw new Error("must not execute");
    },
  };
  await assert.rejects(
    runTask({
      state: createTaskState("No routing capacity", {
        budget: { ...AUTHORED_DEFAULT_BUDGET, maxCalls: 0 },
      }),
      capabilities: ["model"],
      privacy: "metadata-only",
      policy: TRUSTED_POLICY,
      modelHost: host,
      useRouter: true,
    }),
    /router budget denied/,
  );
  assert.equal(routed, false);
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
    assert.deepEqual(verifyReplay(loaded).reasons, []);
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

test("semantic replay still accepts a legacy 1.1.0 trace after the 1.2.0 schema bump", async () => {
  const trace = await runTask({
    state: createTaskState("Legacy schema replay"),
    capabilities: ["model", "read", "shell"],
    privacy: "metadata-only",
    policy: TRUSTED_POLICY,
    modelHost: new DeterministicFakeModelHost(),
  });
  assert.equal(trace.schemaVersion, "1.2.0");

  // Downgrade to how this same run would have been recorded under 1.1.0,
  // including that schema's ASCII spelling of the collapse attractor.
  const { traceHash: _oldHash, ...unsigned } = trace;
  const legacyUnsigned = {
    ...unsigned,
    schemaVersion: "1.1.0" as const,
    attractor: trace.attractor === "∅" ? ("void" as const) : trace.attractor,
  };
  const legacy = {
    ...legacyUnsigned,
    traceHash: createHash("sha256").update(JSON.stringify(legacyUnsigned)).digest("hex"),
  };

  const replay = verifyReplay(legacy);
  assert.deepEqual(replay.reasons, []);
  assert.equal(replay.reproducible, true);
});

test("semantic replay normalizes a legacy 1.1.0 \"void\" attractor to ∅", async () => {
  const trace = await runTask({
    state: createTaskState("Legacy collapse attractor replay"),
    capabilities: ["model", "read", "shell"],
    privacy: "metadata-only",
    policy: TRUSTED_POLICY,
    modelHost: new DeterministicFakeModelHost(),
  });
  const operators = trace.events
    .filter((event) => event.type === "step-completed")
    .map((event) => event.operator);
  assert.ok(operators.length > 0);

  // Re-anchor the same operator sequence at a collapse-bound initial state so
  // the replay genuinely terminates in ∅. Operator legality depends on the
  // sequence and not on (D, C), so every other recorded semantic still holds.
  const collapseInitial = { D: 1, C: 1 };
  let finalState = collapseInitial;
  for (const operator of operators) finalState = applyOperator(finalState, operator);
  assert.equal(classifyAttractor(finalState.D, finalState.C), "∅");

  const { traceHash: _oldHash, ...unsigned } = trace;
  const legacyUnsigned = {
    ...unsigned,
    schemaVersion: "1.1.0" as const,
    initialDissipation: collapseInitial,
    finalDissipation: finalState,
    // The 1.1.0 spelling of the collapse attractor.
    attractor: "void" as const,
  };
  const legacy = {
    ...legacyUnsigned,
    traceHash: createHash("sha256").update(JSON.stringify(legacyUnsigned)).digest("hex"),
  };

  const replay = verifyReplay(legacy);
  assert.deepEqual(replay.reasons, []);
  assert.equal(replay.reproducible, true);
});

test("semantic replay rejects a trace whose schema version is genuinely unsupported", async () => {
  const trace = await runTask({
    state: createTaskState("Unsupported schema replay"),
    capabilities: ["model", "read", "shell"],
    privacy: "metadata-only",
    policy: TRUSTED_POLICY,
    modelHost: new DeterministicFakeModelHost(),
  });
  const { traceHash: _oldHash, ...unsigned } = trace;
  const stale = { ...unsigned, schemaVersion: "1.0.0" as unknown as "1.1.0" };
  const traceHash = createHash("sha256").update(JSON.stringify(stale)).digest("hex");

  const replay = verifyReplay({ ...stale, traceHash });
  assert.equal(replay.reproducible, false);
  assert.ok(
    replay.reasons.includes("unsupported trace schema; semantic replay requires 1.1.0 or 1.2.0"),
  );
});

test("semantic replay rejects a rehashed trace with a forged terminal state", async () => {
  const trace = await runTask({
    state: createTaskState("Replay semantic verification"),
    capabilities: ["model", "read", "shell"],
    privacy: "metadata-only",
    policy: TRUSTED_POLICY,
    modelHost: new DeterministicFakeModelHost(),
  });
  const { traceHash: _oldHash, ...forgedUnsigned } = trace;
  const forged = {
    ...forgedUnsigned,
    finalDissipation: { ...trace.finalDissipation, D: trace.finalDissipation.D + 0.01 },
  };
  const traceHash = createHash("sha256").update(JSON.stringify(forged)).digest("hex");
  const replay = verifyReplay({ ...forged, traceHash });
  assert.equal(replay.reproducible, false);
  assert.ok(replay.reasons.includes("final dissipation does not match deterministic replay"));
});

test("repeated validation failures enter and complete the deterministic HALIRA recovery program", async () => {
  let calls = 0;
  const host: ModelHost = {
    id: "halira-recovery-host",
    version: "1",
    async execute(input) {
      calls += 1;
      return {
        summary: input.operator,
        evidenceRefs: [],
        artifacts: [],
        usage: { tokens: 1, costUsd: 0, latencyMs: 1 },
        validatorPassed: calls > 2,
        uncertainty: 0,
      };
    },
  };
  const trace = await runTask({
    state: createTaskState("Recover after repeated validator failures", {
      budget: { ...AUTHORED_DEFAULT_BUDGET, maxCalls: 20 },
    }),
    capabilities: ["model", "read", "shell"],
    privacy: "metadata-only",
    policy: TRUSTED_POLICY,
    modelHost: host,
  });
  const completed = trace.events.filter((event) => event.type === "step-completed");
  assert.equal(trace.haliraMode, 2);
  assert.equal(trace.bound, true);
  assert.equal(trace.status, "completed");
  assert.deepEqual(verifyReplay(trace).reasons, []);
  assert.deepEqual(
    completed.slice(-6).map((event) => event.operator),
    ["Seed", "Axis", "Meta", "Weave", "Retro", "Ortho"],
  );
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

/**
 * CHARACTERIZATION — updated when the frontier ranking was corrected; see
 * docs/ALGEBRA_DYNAMICS_SEAM.md §3.
 *
 * planTask() feeds every non-HALIRA plan through solve(), so a change to the
 * solver's frontier ordering changes emitted plans. This pins the plan-level
 * effect so it shows up as a named failing assertion rather than a silent diff.
 */
test("planTask emits a pinned solver-derived sequence for a high-dissipation state", () => {
  const plan = planTask({
    state: createTaskState("Fix the parser", { dissipation: { D: 0.7, C: 0.65 } }),
    capabilities: ["model", "read", "shell"],
    privacy: "metadata-only",
    policy: TRUSTED_POLICY,
  });
  assert.deepEqual(
    plan.steps.map((step) => step.operator),
    ["Kata", "Kata", "Kata", "Non"],
  );
  assert.match(plan.rationale[1]!, /cost 0\.7000/);
});

test("planTask emits a pinned solver-derived sequence for the default state", () => {
  const plan = planTask({
    state: createTaskState("Fix the parser"),
    capabilities: ["model", "read", "shell"],
    privacy: "metadata-only",
    policy: TRUSTED_POLICY,
  });
  assert.deepEqual(
    plan.steps.map((step) => step.operator),
    ["Telo", "Non"],
  );
  assert.match(plan.rationale[1]!, /cost 0\.1639/);
});

// --- Tool-host evidence validation -------------------------------------------
//
// A ToolHost is an untrusted boundary in the same way a ModelHost is: whatever
// it returns is written into the trace and folded into traceHash. These pin the
// guard that runs at that boundary.

const TOOL_STATE_DISSIPATION = { D: 0.25, C: 0.05 } as const;

function hex(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}

/** Plans `Ortho Non`; Ortho is the tool-capable operator that allows "read". */
function toolRequestingHost(): ModelHost {
  return {
    id: "tool-requester",
    version: "1",
    async execute(input) {
      return {
        summary: input.operator,
        evidenceRefs: [],
        artifacts: [],
        usage: { tokens: 1, costUsd: 0, latencyMs: 1 },
        validatorPassed: true,
        uncertainty: 0,
        ...(input.operator === "Ortho"
          ? {
              requestedTools: [
                { name: "read", capability: "read", args: { path: "safe.txt" }, timeoutMs: 100 },
              ],
            }
          : {}),
      };
    },
  };
}

function runWithToolResult(result: unknown) {
  return runTask({
    state: {
      ...createTaskState("Investigate the outage"),
      dissipation: TOOL_STATE_DISSIPATION,
    },
    capabilities: ["model", "read", "shell"],
    privacy: "metadata-only",
    policy: TRUSTED_POLICY,
    modelHost: toolRequestingHost(),
    toolHost: {
      id: "probe",
      async call() {
        return result as never;
      },
    },
  });
}

test("a well-formed tool result reaches the trace as evidence and an artifact hash", async () => {
  const evidenceHash = hex("tool-evidence");
  const artifactHash = hex("tool-artifact");
  const trace = await runWithToolResult({
    evidence: { id: "read-1", kind: "tool-result", hash: evidenceHash },
    artifactHash,
    durationMs: 5,
  });

  const ortho = trace.events.find(
    (event) => event.type === "step-completed" && event.operator === "Ortho",
  );
  assert.ok(ortho && ortho.type === "step-completed", "Ortho step was not recorded");
  assert.deepEqual(ortho.evidenceRefs, [
    { id: "read-1", kind: "tool-result", hash: evidenceHash },
  ]);
  assert.deepEqual(ortho.artifactHashes, [artifactHash]);
  const replay = verifyReplay(trace);
  assert.deepEqual(replay.reasons, []);
  assert.equal(replay.reproducible, true);
});

test("a tool result with a malformed evidence hash is rejected before it is traced", async () => {
  await assert.rejects(
    runWithToolResult({
      evidence: { id: "read-1", kind: "tool-result", hash: "not-a-sha256" },
      durationMs: 5,
    }),
    /invalid tool result: read/,
  );
});

test("a tool host cannot launder its output into a stronger evidence kind", async () => {
  for (const kind of ["human-acceptance", "test", "validator", "domain-check"]) {
    await assert.rejects(
      runWithToolResult({
        evidence: { id: "read-1", kind, hash: hex(kind) },
        durationMs: 5,
      }),
      /invalid tool result: read/,
      kind,
    );
  }
});

test("a tool result with a malformed artifact hash is rejected", async () => {
  await assert.rejects(
    runWithToolResult({
      evidence: { id: "read-1", kind: "tool-result", hash: hex("ok") },
      artifactHash: "../../etc/passwd",
      durationMs: 5,
    }),
    /invalid tool result: read/,
  );
});

test("tool result duration is still bounded by the call timeout", async () => {
  for (const durationMs of [-1, Number.NaN, 101]) {
    await assert.rejects(
      runWithToolResult({
        evidence: { id: "read-1", kind: "tool-result", hash: hex("ok") },
        durationMs,
      }),
      /invalid tool result: read/,
      String(durationMs),
    );
  }
});

test("a tool result that is not an object at all is rejected", async () => {
  for (const result of [null, undefined, "ok", 42, []]) {
    await assert.rejects(runWithToolResult(result), /invalid tool result: read/, String(result));
  }
});
