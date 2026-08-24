/**
 * Execution policy for the operator alphabet: the operator-class → capability
 * table and the λ-band → budget table.
 *
 * These tables are **authored policy for this engine**, not part of the ported
 * formalism. src/assets/formalism.json supplies each operator's class, authored
 * λ, meaning, and symbol; everything here is how RecursivePraxis chooses to
 * *execute* an operator carrying those values. Changing a table changes agent
 * behaviour, not the formalism.
 *
 * Proposed in docs/suggestions/operator-sequence-to-execution-language.md
 * (§2 capability schedule, §3 execution budget).
 */

import type { LambdaBand, Operator, OperatorClass } from "../kernel/index.js";
import { operatorClass } from "../kernel/index.js";

/**
 * Mirrors the capability enum on `toolCallSchema` in src/adapters/schemas.ts.
 * Kept as a standalone type so the vocabulary layer does not depend on zod.
 */
export type Capability = "read" | "write" | "shell" | "network";

export type VerificationLevel = "optional" | "single" | "adversarial";

export type ModelTier = "cheap" | "standard" | "strongest";

export interface ExecutionMode {
  /** What the executing agent is doing during this step, in one clause. */
  readonly cognitiveMove: string;
  /** The only tool capabilities a step of this class may be granted. */
  readonly capabilities: readonly Capability[];
  /** What the step must produce for its exit test to be checkable. */
  readonly requiredArtifact: string;
}

/**
 * Class → execution mode. A B-Disruptive step is read-only by construction:
 * a step whose job is to attack the current answer must not be able to commit
 * one. `shell` and `network` are granted to no class here — a prototype does
 * not need them, and widening a capability should be a deliberate edit.
 */
const EXECUTION_MODES: Readonly<Record<OperatorClass, ExecutionMode>> = {
  "B-Disruptive": {
    cognitiveMove: "diverge, attack, rupture the current framing",
    capabilities: ["read"],
    requiredArtifact: "at least two alternatives, or one counterexample",
  },
  "C-Reflexive": {
    cognitiveMove: "inspect the run's own prior output",
    capabilities: ["read"],
    requiredArtifact: "a critique citing earlier instruction indices",
  },
  "D-Structural": {
    cognitiveMove: "frame, integrate, or freeze structure",
    capabilities: ["read", "write"],
    requiredArtifact: "a named frame, hinge, or committed contract",
  },
  "A-Constructive": {
    cognitiveMove: "converge, concretize, commit",
    capabilities: ["read", "write"],
    requiredArtifact: "a concrete edit or a stated decision",
  },
};

export function executionModeForClass(className: OperatorClass): ExecutionMode {
  return EXECUTION_MODES[className];
}

export function executionMode(op: Operator): ExecutionMode {
  return EXECUTION_MODES[operatorClass(op)];
}

export interface ExecutionBudget {
  readonly band: LambdaBand;
  /** How many candidate branches the step may explore. */
  readonly fanOut: number;
  readonly verify: VerificationLevel;
  readonly modelTier: ModelTier;
}

/**
 * λ band → budget. High-λ operators (Non 0.9, Vale 0.88, Meta 0.8, Ana 0.75)
 * inject the most disorder, so they buy fan-out and a mandatory adversarial
 * pass; low-λ stabilizers (Telo 0.25, Latch 0.29) run as a single
 * deterministic pass on the cheapest tier.
 *
 * Band thresholds themselves live with `lambdaBandFor` in src/ir/compile.ts —
 * this table is keyed by the resulting band so the thresholds stay in one place.
 */
const BUDGETS: Readonly<Record<LambdaBand, Omit<ExecutionBudget, "band">>> = {
  low: { fanOut: 1, verify: "optional", modelTier: "cheap" },
  mid: { fanOut: 3, verify: "single", modelTier: "standard" },
  high: { fanOut: 5, verify: "adversarial", modelTier: "strongest" },
};

export function budgetForBand(band: LambdaBand): ExecutionBudget {
  return { band, ...BUDGETS[band] };
}
