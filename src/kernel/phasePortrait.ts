import type { AttractorLabel, DissipationState, Operator } from "./types.js";

export const LYAPUNOV_ALPHA = 0.4;
export const STABILITY_THRESHOLD = 0.3;
export const VOID_D_THRESHOLD = 0.8;
export const VOID_C_THRESHOLD = 0.9;

const ATTRACTOR_PENALTIES: Record<AttractorLabel, number> = {
  "J=0": 0.1,
  "S*": 0.3,
  void: 1.0,
};

/** Ported verbatim from phase_portrait.py `_default_operator_effects`. */
const OPERATOR_EFFECTS: Record<Operator, readonly [number, number]> = {
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

export function operatorEffect(op: Operator): readonly [number, number] {
  return OPERATOR_EFFECTS[op];
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
  if (D > VOID_D_THRESHOLD || C > VOID_C_THRESHOLD) return "void";
  return "S*";
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function applyOperator(state: DissipationState, op: Operator): DissipationState {
  const [deltaD, deltaC] = operatorEffect(op);
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
    state = applyOperator(state, op);
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
