import { createHash } from "node:crypto";
import { checkForbiddenSequence } from "../vocab/grammar.js";
import { ALL_OPERATORS } from "../vocab/operators.js";

export type Provenance = "authored" | "inferred" | "measured" | "grounded";
export type Capability = "model" | "read" | "write" | "shell" | "network";
export type EvidenceKind =
  | "input"
  | "validator"
  | "tool-result"
  | "test"
  | "human-acceptance"
  | "domain-check";

export interface EvidenceRef {
  readonly id: string;
  readonly kind: EvidenceKind;
  readonly hash: string;
}

export interface OperatorContract {
  readonly version: "1.0.0";
  readonly name: string;
  readonly intent: string;
  readonly inputSchema: Readonly<Record<string, string>>;
  readonly outputSchema: Readonly<Record<string, string>>;
  readonly preconditions: readonly string[];
  readonly postconditions: readonly string[];
  readonly allowedCapabilities: readonly Capability[];
  readonly allowedTools: readonly string[];
  readonly stopConditions: readonly string[];
  readonly validators: readonly string[];
  readonly prior: {
    readonly expectedUtility: number;
    readonly estimatedTokens: number;
    readonly estimatedCostUsd: number;
    readonly provenance: "authored";
  };
}

export interface TaskBudget {
  readonly maxTokens: number;
  readonly maxCostUsd: number;
  readonly maxCalls: number;
  readonly maxToolCalls: number;
  readonly maxLatencyMs: number;
}

export interface BudgetUsage {
  readonly tokens: number;
  readonly costUsd: number;
  readonly calls: number;
  readonly toolCalls: number;
  readonly latencyMs: number;
}

export interface ObservableTaskState {
  readonly taskId: string;
  readonly objective: string;
  readonly failedChecks: readonly string[];
  readonly unresolvedClaims: readonly string[];
  readonly alternativesProduced: number;
  readonly toolResults: readonly EvidenceRef[];
  readonly artifacts: readonly EvidenceRef[];
  readonly progress: number;
  readonly uncertainty: number;
  readonly contradictionDetected: boolean;
  readonly budget: TaskBudget;
  readonly usage: BudgetUsage;
}

export interface PlanRequest {
  readonly state: ObservableTaskState;
  readonly capabilities: readonly Capability[];
  readonly privacy: "metadata-only" | "allow-content";
  readonly policy: PolicyProfile;
}

export interface PlanStep {
  readonly index: number;
  readonly operator: string;
  readonly requiredCapabilities: readonly Capability[];
  readonly expectedUtility: number;
  readonly estimatedTokens: number;
  readonly estimatedCostUsd: number;
  readonly validators: readonly string[];
}

export interface Plan {
  readonly id: string;
  readonly specVersion: "1.0.0";
  readonly policyVersion: string;
  readonly steps: readonly PlanStep[];
  readonly expectedUtility: number;
  readonly estimatedTokens: number;
  readonly estimatedCostUsd: number;
  readonly rationale: readonly string[];
}

export interface PolicyProfile {
  readonly name: "trusted" | "experimental";
  readonly version: string;
  readonly utilityAdjustments: Readonly<Record<string, number>>;
  readonly provenance: Provenance;
}

export const AUTHORED_DEFAULT_BUDGET: TaskBudget = {
  maxTokens: 8_000,
  maxCostUsd: 1,
  maxCalls: 6,
  maxToolCalls: 8,
  maxLatencyMs: 120_000,
};

export const TRUSTED_POLICY: PolicyProfile = {
  name: "trusted",
  version: "trusted-1",
  utilityAdjustments: {},
  provenance: "authored",
};

const INTENTS: Readonly<Record<string, string>> = {
  Kata: "Compress findings into a concrete result",
  Telo: "Align work to the requested outcome",
  Ortho: "Correct errors using external checks",
  Pro: "Advance the current solution",
  Latch: "Stabilize a validated result",
  Ana: "Raise the analysis to underlying structure",
  Para: "Generate materially different alternatives",
  Non: "Challenge assumptions with counterevidence",
  Fold: "Reduce scope under pressure",
  Flux: "Explore a changing problem space",
  Meta: "Inspect the current reasoning process",
  Retro: "Trace backward from an observed outcome",
  Echo: "Reuse an evidenced pattern",
  Braid: "Interleave multiple perspectives",
  Seed: "Establish initial facts and framing",
  Crux: "Resolve a consequential decision point",
  Weave: "Synthesize evidence into a coherent result",
  Bind: "Connect dependencies and conclusions",
  Axis: "Define boundaries and evaluation criteria",
  Vale: "Perform a deep bounded investigation",
};

const TOOL_OPERATORS = new Set(["Ortho", "Pro", "Retro", "Echo", "Vale"]);
const ALLOWED_TOOLS: Readonly<Record<string, readonly string[]>> = {
  Ortho: ["check", "read"],
  Pro: ["read", "write", "shell"],
  Retro: ["read"],
  Echo: ["read"],
  Vale: ["read", "fetch"],
};

export const OPERATOR_PACK: readonly OperatorContract[] = ALL_OPERATORS.map((op) => ({
  version: "1.0.0",
  name: op.name,
  intent: INTENTS[op.name] ?? `Apply ${op.name}`,
  inputSchema: { objective: "string", evidenceRefs: "string[]" },
  outputSchema: { summary: "string", evidenceRefs: "string[]", artifacts: "artifact[]" },
  preconditions: ["objective-present", "budget-available"],
  postconditions: ["structured-output", "evidence-references-declared"],
  allowedCapabilities: TOOL_OPERATORS.has(op.name)
    ? ["model", "read", "shell"]
    : ["model"],
  allowedTools: ALLOWED_TOOLS[op.name] ?? [],
  stopConditions: ["objective-satisfied", "budget-exhausted", "validator-terminal"],
  validators: ["structured-output", "evidence-reference-integrity"],
  prior: {
    // Authored bootstrap priors; learning may adjust these only through versioned policy.
    expectedUtility: op.className === "Constructive" ? 0.66 : 0.58,
    estimatedTokens: op.name === "Vale" ? 1_400 : 700,
    estimatedCostUsd: op.name === "Vale" ? 0.08 : 0.04,
    provenance: "authored",
  },
}));

const SPEC_INDEX = new Map(OPERATOR_PACK.map((spec) => [spec.name, spec]));

export function operatorContract(name: string): OperatorContract {
  const spec = SPEC_INDEX.get(name);
  if (!spec) throw new Error(`unknown operator contract: ${name}`);
  return spec;
}

export function remainingBudget(state: ObservableTaskState): TaskBudget {
  return {
    maxTokens: state.budget.maxTokens - state.usage.tokens,
    maxCostUsd: state.budget.maxCostUsd - state.usage.costUsd,
    maxCalls: state.budget.maxCalls - state.usage.calls,
    maxToolCalls: state.budget.maxToolCalls - state.usage.toolCalls,
    maxLatencyMs: state.budget.maxLatencyMs - state.usage.latencyMs,
  };
}

export function budgetAllows(
  budget: TaskBudget,
  estimate: Pick<BudgetUsage, "tokens" | "costUsd" | "calls" | "toolCalls" | "latencyMs">,
): boolean {
  return (
    estimate.tokens <= budget.maxTokens &&
    estimate.costUsd <= budget.maxCostUsd &&
    estimate.calls <= budget.maxCalls &&
    estimate.toolCalls <= budget.maxToolCalls &&
    estimate.latencyMs <= budget.maxLatencyMs
  );
}

function candidateSequences(state: ObservableTaskState): readonly string[][] {
  const candidates: string[][] = [["Telo", "Kata", "Latch"]];
  if (state.failedChecks.length > 0) candidates.push(["Ortho", "Kata", "Latch"]);
  if (state.unresolvedClaims.length > 0) candidates.push(["Seed", "Weave", "Latch"]);
  if (state.uncertainty >= 0.5) candidates.push(["Axis", "Para", "Weave", "Latch"]);
  if (state.contradictionDetected) candidates.push(["Non", "Weave", "Ortho", "Latch"]);
  if (state.progress === 0) candidates.push(["Seed", "Telo", "Kata", "Latch"]);
  return candidates;
}

function makePlan(
  sequence: readonly string[],
  request: PlanRequest,
): Plan | undefined {
  if (!checkForbiddenSequence(sequence).accepted) return undefined;
  const grants = new Set(request.capabilities);
  const steps: PlanStep[] = [];
  let utility = 0;
  let tokens = 0;
  let cost = 0;
  let toolCalls = 0;
  for (const [index, name] of sequence.entries()) {
    const spec = operatorContract(name);
    const required = spec.allowedCapabilities.filter((capability) => capability === "model");
    if (required.some((capability) => !grants.has(capability))) return undefined;
    if (required.some((capability) => capability !== "model")) toolCalls += 1;
    const relevance =
      (request.state.failedChecks.length > 0 && name === "Ortho" ? 0.12 : 0) +
      (request.state.unresolvedClaims.length > 0 && ["Seed", "Weave"].includes(name)
        ? 0.08
        : 0) +
      (request.state.contradictionDetected && ["Non", "Ortho"].includes(name) ? 0.1 : 0);
    const adjusted =
      spec.prior.expectedUtility +
      relevance +
      (request.policy.utilityAdjustments[name] ?? 0);
    utility += adjusted;
    tokens += spec.prior.estimatedTokens;
    cost += spec.prior.estimatedCostUsd;
    steps.push({
      index,
      operator: name,
      requiredCapabilities: required,
      expectedUtility: adjusted,
      estimatedTokens: spec.prior.estimatedTokens,
      estimatedCostUsd: spec.prior.estimatedCostUsd,
      validators: spec.validators,
    });
  }
  if (!budgetAllows(remainingBudget(request.state), {
    tokens,
    costUsd: cost,
    calls: steps.length,
    toolCalls,
    latencyMs: steps.length * 10_000,
  })) return undefined;
  const stable = JSON.stringify({
    taskId: request.state.taskId,
    sequence,
    policy: request.policy.version,
  });
  return {
    id: createHash("sha256").update(stable).digest("hex").slice(0, 16),
    specVersion: "1.0.0",
    policyVersion: request.policy.version,
    steps,
    expectedUtility: utility / steps.length,
    estimatedTokens: tokens,
    estimatedCostUsd: cost,
    rationale: [
      "hard grammar and capability grants accepted",
      "ranked by expected grounded utility, then estimated cost",
    ],
  };
}

export function planTask(request: PlanRequest): Plan {
  const plans = candidateSequences(request.state)
    .map((sequence) => makePlan(sequence, request))
    .filter((plan): plan is Plan => plan !== undefined);
  plans.sort(
    (a, b) =>
      b.expectedUtility - a.expectedUtility ||
      a.estimatedCostUsd - b.estimatedCostUsd ||
      a.estimatedTokens - b.estimatedTokens ||
      a.id.localeCompare(b.id),
  );
  const selected = plans[0];
  if (!selected) {
    throw new Error("no valid plan within capability grants and budget");
  }
  return selected;
}

export function createTaskState(
  objective: string,
  options: Partial<ObservableTaskState> = {},
): ObservableTaskState {
  const taskId =
    options.taskId ??
    createHash("sha256").update(objective).digest("hex").slice(0, 16);
  return {
    taskId,
    objective,
    failedChecks: [],
    unresolvedClaims: [],
    alternativesProduced: 0,
    toolResults: [],
    artifacts: [],
    progress: 0,
    uncertainty: 0.25,
    contradictionDetected: false,
    budget: AUTHORED_DEFAULT_BUDGET,
    usage: { tokens: 0, costUsd: 0, calls: 0, toolCalls: 0, latencyMs: 0 },
    ...options,
  };
}
