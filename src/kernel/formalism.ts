import formalismData from "../assets/formalism.json" with { type: "json" };
import type { AttractorLabel, Operator, OperatorClass } from "./types.js";
import { OPERATORS } from "./types.js";

interface FormalismOperatorEntry {
  readonly index: number;
  readonly class: OperatorClass;
  readonly lambda_intrinsic: number;
  readonly effect_vector: readonly [number, number];
  readonly meaning: string;
  readonly symbol: string;
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

export function allOperators(): readonly Operator[] {
  return OPERATORS;
}
