import { createHash } from "node:crypto";
import { checkForbiddenSequence } from "../vocab/grammar.js";
import { ALL_OPERATORS } from "../vocab/operators.js";
import {
  DEFAULT_BEAM_WIDTH,
  analyzeSequence,
  lambdaIntrinsic,
  solve,
  type DissipationState,
  type HaliraStep,
  type Operator,
  type SolveResult,
} from "../kernel/index.js";

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
  readonly name: Operator;
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
  readonly dissipation: DissipationState;
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
  readonly operator: Operator;
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
    expectedUtility: op.className === "A-Constructive" ? 0.66 : 0.58,
    estimatedTokens: op.name === "Vale" ? 1_400 : 700,
    estimatedCostUsd: op.name === "Vale" ? 0.08 : 0.04,
    provenance: "authored",
  },
}));

const SPEC_INDEX = new Map(OPERATOR_PACK.map((spec) => [spec.name, spec]));

export function operatorContract(name: Operator): OperatorContract {
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

/**
 * Fixed target attractor for sequencing: a low-D, low-C stable ("J=0")
 * dissipation state. planTask() always searches from the task's current
 * dissipation state toward this target; the initial state carries the
 * task-specific signal (see deriveInitialDissipation), the target does not.
 */
export const STABLE_TARGET_DISSIPATION: DissipationState = { D: 0.1, C: 0.1 };

/**
 * Mirrors the kernel's Mode-1 nextAnomalyArtifact() rule (session.ts): a
 * sequence carries an anomaly artifact once it contains a Non, or a
 * Para/Retro immediately after a Meta.
 */
function hasAnomalyArtifact(sequence: readonly Operator[]): boolean {
  for (let index = 0; index < sequence.length; index += 1) {
    const cur = sequence[index]!;
    const prev = index > 0 ? sequence[index - 1] : undefined;
    if (cur === "Non") return true;
    if ((cur === "Para" || cur === "Retro") && prev === "Meta") return true;
  }
  return false;
}

/**
 * The beam solver optimizes purely for reaching the target dissipation
 * state cheaply; it has no notion of the kernel's bind() requirement that a
 * committed sequence carry an anomaly artifact. Rather than teach the
 * (verbatim-ported) solver about bind-feasibility, guarantee it here: if the
 * solved sequence lacks one, append a stabilizer (only if the sequence ends
 * on Vale, which requires one before anything else may follow) and then
 * Non. This keeps every Plan this module returns bindable by construction.
 */
function ensureAnomalyArtifact(sequence: readonly Operator[]): readonly Operator[] {
  if (hasAnomalyArtifact(sequence)) return sequence;
  const endsOnVale = sequence[sequence.length - 1] === "Vale";
  const stabilized: readonly Operator[] = endsOnVale ? [...sequence, "Kata"] : sequence;
  return [...stabilized, "Non"];
}

function makePlan(
  proposedSequence: readonly Operator[],
  request: PlanRequest,
  sourceRationale: string,
  ensureArtifact = true,
): Plan | undefined {
  // An empty solver sequence means the initial state is already within the
  // solver's distance threshold of the target — ensureAnomalyArtifact still
  // produces a minimal valid (["Non"]) plan for that case rather than
  // treating "already near target" as "no plan possible".
  const sequence = ensureArtifact ? ensureAnomalyArtifact(proposedSequence) : proposedSequence;
  if (!checkForbiddenSequence(sequence).accepted) return undefined;

  const analysis = analyzeSequence(sequence);
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

    // Per-step utility from the kernel's dissipation cost model: the cost of
    // the transition into this step (the first step has no predecessor, so
    // it falls back to the operator's own intrinsic λ), mapped through
    // 1/(1+cost) so lower dissipation cost yields higher utility.
    const transitionCost =
      index === 0
        ? lambdaIntrinsic(name)
        : (analysis.pairwiseCosts[index - 1]?.lambda ?? lambdaIntrinsic(name));
    const adjusted = 1 / (1 + transitionCost) + (request.policy.utilityAdjustments[name] ?? 0);

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

  if (
    !budgetAllows(remainingBudget(request.state), {
      tokens,
      costUsd: cost,
      calls: steps.length,
      toolCalls,
      latencyMs: steps.length * 10_000,
    })
  ) {
    return undefined;
  }

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
      sourceRationale,
    ],
  };
}

export function planTask(request: PlanRequest): Plan {
  const result = solve({
    initial: request.state.dissipation,
    target: STABLE_TARGET_DISSIPATION,
    beamWidth: DEFAULT_BEAM_WIDTH,
  });
  const plan = makePlan(
    result.sequence,
    request,
    `solver-derived sequence toward stable target dissipation state (cost ${result.cost.toFixed(4)})`,
  );
  if (!plan) {
    throw new Error("no valid plan within capability grants and budget");
  }
  return plan;
}

/**
 * The fixed, inspectable recovery program used after the kernel has entered
 * HALIRA Mode 2.  It deliberately does not invoke the beam solver: Mode 2 is
 * a prescribed corrective procedure, not another unconstrained attempt at
 * optimization.  The final Recognition step is represented by bind(), not a
 * model operator, so it has no plan step here.
 */
const HALIRA_RECOVERY_PROGRAM: readonly Operator[] = [
  "Seed",
  "Axis",
  "Meta",
  "Weave",
  "Retro",
  "Ortho",
];

export function planHaliraRecoveryTask(
  request: PlanRequest,
  haliraStep: HaliraStep,
): Plan {
  if (haliraStep < 1 || haliraStep > 7) {
    throw new Error("HALIRA recovery has not started");
  }
  const sequence = HALIRA_RECOVERY_PROGRAM.slice(haliraStep - 1);
  if (sequence.length === 0) {
    throw new Error("HALIRA recovery is ready for recognition and binding");
  }
  const plan = makePlan(
    sequence,
    request,
    `HALIRA Mode-2 recovery program from step ${haliraStep}`,
    false,
  );
  if (!plan) {
    throw new Error("no valid HALIRA recovery plan within capability grants and budget");
  }
  return plan;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Deterministic mapping from observable task-state signals to an initial
 * dissipation state for the solver to search from. Higher uncertainty and
 * more failed checks raise D (dissipation); unresolved claims and detected
 * contradictions raise C. Authored constants, not measured.
 */
function deriveInitialDissipation(
  state: Pick<
    ObservableTaskState,
    "uncertainty" | "failedChecks" | "unresolvedClaims" | "contradictionDetected"
  >,
): DissipationState {
  return {
    D: clamp01(0.2 + state.uncertainty * 0.4 + state.failedChecks.length * 0.1),
    C: clamp01(
      0.15 + state.unresolvedClaims.length * 0.08 + (state.contradictionDetected ? 0.25 : 0),
    ),
  };
}

export function createTaskState(
  objective: string,
  options: Partial<ObservableTaskState> = {},
): ObservableTaskState {
  const taskId =
    options.taskId ??
    createHash("sha256").update(objective).digest("hex").slice(0, 16);
  const merged: ObservableTaskState = {
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
    dissipation: STABLE_TARGET_DISSIPATION,
    budget: AUTHORED_DEFAULT_BUDGET,
    usage: { tokens: 0, costUsd: 0, calls: 0, toolCalls: 0, latencyMs: 0 },
    ...options,
  };
  if (options.dissipation) return merged;
  return { ...merged, dissipation: deriveInitialDissipation(merged) };
}
