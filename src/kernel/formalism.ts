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

interface FormalismOperatorClassEntry {
  readonly members: readonly Operator[];
  readonly characteristics: string;
  readonly commutation_bias: string;
}

interface FormalismDissipationRules {
  readonly pairwise_interaction_coefficient: number;
  readonly max_interaction_magnitude: number;
}

interface FormalismAttractorEntry {
  readonly name: string;
  readonly description: string;
  readonly basin: string;
  readonly characteristics: string;
  readonly phase_state_label: string;
  readonly reached_by: readonly string[];
  /** Stated only for the collapse attractor. */
  readonly escape_requires?: readonly string[];
}

interface FormalismPhasePortrait {
  readonly attractors: {
    readonly J_equals_0: FormalismAttractorEntry & { readonly lyapunov_threshold: number };
    readonly S_star: FormalismAttractorEntry;
    readonly void: FormalismAttractorEntry;
  };
  readonly transitions: Record<string, readonly Operator[]>;
  readonly lyapunov: { readonly alpha: number };
}

interface FormalismInverseSolver {
  readonly objective: {
    readonly beta: number;
    readonly gamma: number;
  };
  readonly attractor_penalties: {
    readonly J_equals_0: number;
    readonly S_star: number;
    readonly void: number;
  };
  readonly termination: {
    readonly distance_threshold: number;
    readonly max_path_length: number;
  };
}

interface FormalismDocument {
  readonly operators: Record<Operator, FormalismOperatorEntry>;
  readonly operator_classes: Record<OperatorClass, FormalismOperatorClassEntry>;
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

/**
 * The solver's objective weights and stopping rule, as `inverse_solver` states
 * them.
 *
 * These four were hardcoded in `solver.ts` with the same values this file
 * states, while `attractor_penalties` — the third field of the same JSON block
 * — was read from here. The block was half-wired, so editing a weight in the
 * formalism moved nothing. Reading them here makes the file the single source
 * of truth for the whole block; `solver.ts` re-exports them under its existing
 * names, which is what its callers and tests import.
 *
 * `DEFAULT_BEAM_WIDTH` stays in `solver.ts`: the formalism states no beam
 * width, so there is nothing here for it to read.
 */
export const SOLVER_BETA = formalism.inverse_solver.objective.beta;
export const SOLVER_GAMMA = formalism.inverse_solver.objective.gamma;
export const DISTANCE_THRESHOLD = formalism.inverse_solver.termination.distance_threshold;
export const MAX_PATH_LENGTH = formalism.inverse_solver.termination.max_path_length;

/** Values consumed by the phase portrait; kept here so its topology has one
 * source of truth with the copied formalism, as the Python implementation did. */
export const PHASE_PORTRAIT_ALPHA = formalism.phase_portrait.lyapunov.alpha;
export const PHASE_PORTRAIT_STABILITY_THRESHOLD =
  formalism.phase_portrait.attractors.J_equals_0.lyapunov_threshold;

/**
 * The formalism spells an attractor the same way in both blocks it appears in
 * — `phase_portrait.attractors` and `inverse_solver.attractor_penalties` — so
 * one map serves both rather than each reader keeping its own.
 */
const ATTRACTOR_KEYS: Readonly<Record<AttractorLabel, keyof FormalismInverseSolver["attractor_penalties"]>> = {
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

/** What the formalism says an attractor *is*, beside the number that scores it. */
export interface AttractorProfile {
  readonly label: AttractorLabel;
  /** e.g. "Noble Gas (Productive Contradiction)". */
  readonly name: string;
  readonly description: string;
  readonly basin: string;
  readonly characteristics: string;
  readonly phaseStateLabel: string;
  /**
   * How the formalism says the attractor is reached — as authored, which is
   * not a uniform kind: `J=0` lists four operators, `S*` says "Ana + Pro +
   * Para combinations" and the void says "repeated Meta". Strings, therefore,
   * and not parsed into operators: three of these entries are prose, and
   * typing them as an operator list would be a claim the file does not make.
   */
  readonly reachedBy: readonly string[];
  /** Only the collapse attractor states one, and it is a clean operator list. */
  readonly escapeRequires?: readonly Operator[];
}

/**
 * The `phase_portrait.attractors` entry for a label.
 *
 * The block was read for one number (`J=0`'s Lyapunov threshold) and its prose
 * went unused, so every command printed a bare `∅` and left the reader to know
 * what that meant — including `analyze`, which warned that a trajectory
 * "requires rescue" while the file three lines away named the rescue.
 */
export function attractorProfile(label: AttractorLabel): AttractorProfile {
  const entry = formalism.phase_portrait.attractors[ATTRACTOR_KEYS[label]];
  const profile = {
    label,
    name: entry.name,
    description: entry.description,
    basin: entry.basin,
    characteristics: entry.characteristics,
    phaseStateLabel: entry.phase_state_label,
    reachedBy: entry.reached_by,
  };
  if (entry.escape_requires === undefined) return profile;
  return { ...profile, escapeRequires: escapeOperators(label, entry.escape_requires) };
}

/** Fail-closed: an escape route naming something that is not an operator is
 * advice no caller could act on, so it throws rather than being passed along. */
function escapeOperators(label: AttractorLabel, authored: readonly string[]): readonly Operator[] {
  return authored.map((name) => {
    if (!(OPERATORS as readonly string[]).includes(name)) {
      throw new Error(
        `phase_portrait.attractors["${label}"].escape_requires names "${name}", which is not an operator`,
      );
    }
    return name as Operator;
  });
}

export function formalismAttractorPenalty(attractor: AttractorLabel): number {
  return formalism.inverse_solver.attractor_penalties[ATTRACTOR_KEYS[attractor]];
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

/** What the formalism says about a whole class, beside its member list. */
export interface OperatorClassProfile {
  readonly className: OperatorClass;
  readonly members: readonly Operator[];
  /** e.g. B-Disruptive = "Rupture, increase entropy, destabilize". */
  readonly characteristics: string;
  /** How members of this class tend to commute, e.g. "mostly ±1". Advisory
   * prose about the class, not a substitute for `commutatorMagnitude`. */
  readonly commutationBias: string;
}

/**
 * The `operator_classes` entry for a class. Until this accessor the block's
 * prose was unread: `operatorClass` returned the label and nothing said what
 * the label meant, so every consumer that wanted the distinction re-authored it.
 */
export function operatorClassProfile(className: OperatorClass): OperatorClassProfile {
  const entry = formalism.operator_classes[className];
  return {
    className,
    members: entry.members,
    characteristics: entry.characteristics,
    commutationBias: entry.commutation_bias,
  };
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
