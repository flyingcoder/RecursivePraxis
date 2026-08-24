import type { AttractorLabel, DissipationState, Operator } from "./types.js";

export const LYAPUNOV_ALPHA = 0.4;
export const STABILITY_THRESHOLD = 0.3;
export const VOID_D_THRESHOLD = 0.8;
export const VOID_C_THRESHOLD = 0.9;

const ATTRACTOR_PENALTIES: Record<AttractorLabel, number> = {
  "J=0": 0.1,
  "S*": 0.3,
  "∅": 1.0,
};

/**
 * A complete per-operator displacement table. Supplying one lets an alternative
 * physics be evaluated without editing the kernel; the built-in table is
 * `DEFAULT_OPERATOR_EFFECTS`.
 *
 * The seam reaches `operatorEffect`, `applyOperator`, `simulateTrajectory` and
 * `solve` (via `SolveOptions.effects`) — not further. `session.ts` `step` and
 * the `analyze` command still call `applyOperator` with the default table, so a
 * sequence solved under an injected table will be *stepped* under the default
 * one. Widening the seam to those call sites is unbuilt work.
 */
export type OperatorEffects = Readonly<Record<Operator, readonly [number, number]>>;

/**
 * Ported verbatim from phase_portrait.py `_default_operator_effects` — and
 * "verbatim" is a claim about *porting fidelity only*. It says nothing about
 * where the numbers came from, which is the question a reader landing here
 * actually has.
 *
 * Provenance: these vectors are **generated from operator class, not measured**.
 * The upstream docstring states the rule it applied — A-Constructive gets
 * negative ΔD/ΔC, B-Disruptive positive, C-Reflexive small or mixed,
 * D-Structural specialized — and the individual magnitudes were then chosen by
 * hand to spread the operators out within their class. No value here is
 * calibrated against an observed agent outcome, and none should be cited as
 * evidence about one.
 *
 * They are a placeholder with the right *shape*. Replacing them is the point of
 * this table being injectable — see `OperatorEffects`.
 */
export const DEFAULT_OPERATOR_EFFECTS: OperatorEffects = {
  Ana: [0.15, 0.1],
  Kata: [-0.2, -0.15],
  Meta: [0.1, 0.05],
  Para: [0.12, 0.18],
  Non: [0.25, 0.2],
  Telo: [-0.18, -0.1],
  Retro: [-0.05, 0.0],
  Ortho: [-0.15, -0.12],
  Pro: [0.05, 0.02],
  Echo: [0.08, 0.06],
  Braid: [0.1, 0.12],
  Fold: [0.18, 0.14],
  Seed: [-0.17, -0.11],
  Crux: [0.07, 0.09],
  Weave: [-0.16, -0.13],
  Bind: [-0.14, -0.1],
  Axis: [-0.16, -0.12],
  Vale: [0.22, 0.18],
  Flux: [0.14, 0.11],
  Latch: [-0.17, -0.12],
};

export function operatorEffect(
  op: Operator,
  effects: OperatorEffects = DEFAULT_OPERATOR_EFFECTS,
): readonly [number, number] {
  return effects[op];
}

export function lyapunov(D: number, C: number): number {
  return D + LYAPUNOV_ALPHA * C;
}

/** Ported from phase_portrait.py `classify_attractor` — order matches
 * exactly (V<0.3 checked first); the two branches are mutually exclusive
 * by construction since D>0.8 or C>0.9 always forces V>=0.3. */
export function classifyAttractor(D: number, C: number): AttractorLabel {
  const V = lyapunov(D, C);
  if (V < STABILITY_THRESHOLD) return "J=0";
  if (D > VOID_D_THRESHOLD || C > VOID_C_THRESHOLD) return "∅";
  return "S*";
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function applyOperator(
  state: DissipationState,
  op: Operator,
  effects: OperatorEffects = DEFAULT_OPERATOR_EFFECTS,
): DissipationState {
  const [deltaD, deltaC] = operatorEffect(op, effects);
  return {
    D: clamp01(state.D + deltaD),
    C: clamp01(state.C + deltaC),
  };
}

export function attractorPenalty(attractor: AttractorLabel): number {
  return ATTRACTOR_PENALTIES[attractor];
}

export interface TrajectoryStep {
  readonly step: number;
  readonly operator: Operator | null;
  readonly D: number;
  readonly C: number;
  readonly V: number;
  readonly attractor: AttractorLabel;
}

export function simulateTrajectory(
  initial: DissipationState,
  sequence: readonly Operator[],
  effects: OperatorEffects = DEFAULT_OPERATOR_EFFECTS,
): TrajectoryStep[] {
  let state = initial;
  const trajectory: TrajectoryStep[] = [
    {
      step: 0,
      operator: null,
      D: state.D,
      C: state.C,
      V: lyapunov(state.D, state.C),
      attractor: classifyAttractor(state.D, state.C),
    },
  ];

  sequence.forEach((op, index) => {
    state = applyOperator(state, op, effects);
    trajectory.push({
      step: index + 1,
      operator: op,
      D: state.D,
      C: state.C,
      V: lyapunov(state.D, state.C),
      attractor: classifyAttractor(state.D, state.C),
    });
  });

  return trajectory;
}

/**
 * Ported from phase_portrait.py `suggest_transition_operators`.
 *
 * Two tables in the quarry disagree about this, and this is the one to port.
 * `formalism.json` → `phase_portrait.transitions` has five entries of two
 * operators each; the Python map has six (it adds `J=0 → ∅`) of three to four.
 * The Python table is a strict superset, its docstring records the intent
 * ("all 20 operators for richer suggestions"), and it is the one actually read
 * — by `controlled_rupture_cli.py:107`, which produced the output this port
 * exists to restore. The JSON table is inert and is labelled superseded in
 * `src/assets/NOTICE.md` item 7.
 *
 * Keys are `from|to`. Same-attractor pairs are deliberately absent: there is no
 * transition to suggest when you are already there.
 */
const TRANSITION_SUGGESTIONS: Readonly<Record<string, readonly Operator[]>> = {
  // Stabilizing transitions (→ J=0)
  "S*|J=0": ["Kata", "Telo", "Seed", "Latch"],
  "∅|J=0": ["Telo", "Kata", "Axis", "Bind"],

  // Activating transitions (→ S*)
  "J=0|S*": ["Para", "Ana", "Crux", "Echo"],
  "∅|S*": ["Pro", "Ortho", "Weave", "Seed"],

  // Destabilizing transitions (→ ∅)
  "S*|∅": ["Non", "Meta", "Vale", "Fold"],
  "J=0|∅": ["Non", "Vale", "Flux"],
};

/**
 * Operators suggested for moving from one attractor to another. Returns an
 * empty list for any unmapped pair, including same-attractor pairs — callers
 * should suppress the suggestion entirely rather than print an empty one, which
 * is what the upstream CLI does.
 *
 * These are a *suggestion surface*, not a constraint: nothing in the solver
 * consults this table, and the operators it names are not filtered for or
 * against. Note also that it is not beyond question as data — it lists `Seed`
 * as both a stabiliser (`S*`→`J=0`) and an activator (`∅`→`S*`).
 */
export function suggestTransitionOperators(
  from: AttractorLabel,
  to: AttractorLabel,
): readonly Operator[] {
  return TRANSITION_SUGGESTIONS[`${from}|${to}`] ?? [];
}
