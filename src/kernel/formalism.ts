import formalismData from "../assets/formalism.json" with { type: "json" };
import type { AttractorLabel, Idempotence, Operator, OperatorClass } from "./types.js";
import { OPERATORS } from "./types.js";

interface FormalismOperatorEntry {
  readonly index: number;
  readonly name: string;
  readonly class: OperatorClass;
  readonly lambda_intrinsic: number;
  readonly effect_vector: readonly [number, number];
  readonly meaning: string;
  readonly effect: string;
  readonly symbol: string;
  readonly idempotent: Idempotence;
  readonly idempotence_rule?: string;
}

interface FormalismDissipationRules {
  readonly pairwise_interaction_coefficient: number;
  readonly max_interaction_magnitude: number;
}

interface FormalismPhasePortrait {
  readonly attractors: {
    readonly J_equals_0: { readonly lyapunov_threshold: number };
  };
  readonly transitions: Record<string, readonly Operator[]>;
  readonly lyapunov: { readonly alpha: number };
}

interface FormalismInverseSolver {
  readonly attractor_penalties: {
    readonly J_equals_0: number;
    readonly S_star: number;
    readonly void: number;
  };
}

interface FormalismDocument {
  readonly operators: Record<Operator, FormalismOperatorEntry>;
  readonly dissipation_rules: FormalismDissipationRules;
  readonly phase_portrait: FormalismPhasePortrait;
  readonly inverse_solver: FormalismInverseSolver;
}

export interface OperatorIdempotence {
  readonly idempotent: Idempotence;
  /** Present only where the formalism states one, i.e. never for `false`. */
  readonly rule?: string;
}

const formalism = formalismData as unknown as FormalismDocument;

export const DISSIPATION_PAIRWISE_COEFFICIENT =
  formalism.dissipation_rules.pairwise_interaction_coefficient;
export const DISSIPATION_MAX_INTERACTION =
  formalism.dissipation_rules.max_interaction_magnitude;

/** Values consumed by the phase portrait; kept here so its topology has one
 * source of truth with the copied formalism, as the Python implementation did. */
export const PHASE_PORTRAIT_ALPHA = formalism.phase_portrait.lyapunov.alpha;
export const PHASE_PORTRAIT_STABILITY_THRESHOLD =
  formalism.phase_portrait.attractors.J_equals_0.lyapunov_threshold;

const ATTRACTOR_PENALTY_KEYS: Readonly<Record<AttractorLabel, keyof FormalismInverseSolver["attractor_penalties"]>> = {
  "J=0": "J_equals_0",
  "S*": "S_star",
  "∅": "void",
};

const TRANSITION_KEYS: Readonly<Record<`${AttractorLabel}|${AttractorLabel}`, string | undefined>> = {
  "J=0|J=0": undefined,
  "J=0|S*": "J0_to_S_star",
  "J=0|∅": undefined,
  "S*|J=0": "S_star_to_J0",
  "S*|S*": undefined,
  "S*|∅": "S_star_to_void",
  "∅|J=0": "void_to_J0",
  "∅|S*": "void_to_S_star",
  "∅|∅": undefined,
};

export function formalismAttractorPenalty(attractor: AttractorLabel): number {
  return formalism.inverse_solver.attractor_penalties[ATTRACTOR_PENALTY_KEYS[attractor]];
}

/** The formalism's required operators for a transition. This is deliberately
 * distinct from the richer Python suggestion surface. */
export function formalismTransitionOperators(
  from: AttractorLabel,
  to: AttractorLabel,
): readonly Operator[] {
  const key = TRANSITION_KEYS[`${from}|${to}`];
  return key === undefined ? [] : (formalism.phase_portrait.transitions[key] ?? []);
}

export function lambdaIntrinsic(op: Operator): number {
  return formalism.operators[op].lambda_intrinsic;
}

/**
 * `[ΔD, ΔC]` for the operator, as authored in `formalism.json`. Unlike
 * `lambda_intrinsic`, this value did not come from the upstream spec — it is
 * this repo's own class-generated placeholder, folded into the JSON for a
 * single source of truth. See NOTICE.md item 8.
 */
export function operatorEffectVector(op: Operator): readonly [number, number] {
  return formalism.operators[op].effect_vector;
}

export function operatorClass(op: Operator): OperatorClass {
  return formalism.operators[op].class;
}

export function operatorMeaning(op: Operator): string {
  return formalism.operators[op].meaning;
}

/**
 * The operator's Unicode glyph from the formalism spec (e.g. Ana = "↑").
 * Display-only: the canonical identifier everywhere in this engine is the
 * operator *name*. Note that Vale's glyph is "∅", the same character the
 * phase portrait uses for the collapse attractor — see docs/VOCABULARY.md.
 */
export function operatorSymbol(op: Operator): string {
  return formalism.operators[op].symbol;
}

/** The operator's 1-based position in the formalism's 20-operator table. */
export function operatorIndex(op: Operator): number {
  return formalism.operators[op].index;
}

/** The operator's full name (e.g. Ana = "Analysis/Abstraction"). */
export function operatorName(op: Operator): string {
  return formalism.operators[op].name;
}

/**
 * The `effect` field: what applying this operator does to the state, in the
 * formalism's own words (e.g. Ana = "increases entropy"). Distinct from
 * `meaning`, which describes the move rather than its consequence.
 */
export function operatorEffectNote(op: Operator): string {
  return formalism.operators[op].effect;
}

/**
 * The operator's idempotence and, where the formalism states one, its algebraic
 * rule. `true` means X² = X, `"semi"` means X² = c·X for a stated coefficient,
 * `false` means every re-application is a fresh act.
 */
export function operatorIdempotence(op: Operator): OperatorIdempotence {
  const entry = formalism.operators[op];
  return entry.idempotence_rule === undefined
    ? { idempotent: entry.idempotent }
    : { idempotent: entry.idempotent, rule: entry.idempotence_rule };
}

export function allOperators(): readonly Operator[] {
  return OPERATORS;
}
