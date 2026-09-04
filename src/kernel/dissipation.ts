import type { Operator } from "./types.js";
import {
  DISSIPATION_MAX_INTERACTION,
  DISSIPATION_PAIRWISE_COEFFICIENT,
  lambdaIntrinsic,
} from "./formalism.js";
import { commutatorMagnitude } from "./commutator.js";

export interface PairwiseCost {
  readonly step: number;
  readonly transition: string;
  readonly lambda: number;
}

export interface SequenceAnalysis {
  readonly sequence: readonly Operator[];
  readonly lambdaEffective: number;
  readonly totalCost: number;
  readonly pairwiseCosts: readonly PairwiseCost[];
  readonly predictedDecay: readonly number[];
  readonly halfLife: number;
}

/**
 * `λ(i→j) = λ_j_intrinsic + min(c·|η_ij|, max_interaction_magnitude)`, ported
 * from `dissipation_calculator.py`'s `lambda_pairwise`.
 *
 * The clamp goes around the *scaled* term, not around `|η|`. Both this
 * docstring and `formalism.json`'s `formula` string used to state the
 * transposed form, `λ_j + c·min(max, |η|)`, which differs on every pair with
 * `|η| > 0.4` — the two readings cap the interaction at 0.15 and at 0.06
 * respectively. The implementation was right and both prose statements were
 * wrong: upstream's calculator implements the clamp this way and, as
 * `docs/inspirations/20-controlled-rupture-operators.md` records, does not read
 * its own formula string either. Pinned by the dissipation tests so the prose
 * cannot drift from the code again.
 *
 * A consequence worth stating: `|η| ≤ 1` and `c = 0.15`, so `c·|η| ≤ 0.15` and
 * the `0.4` clamp never binds for any of the 400 pairs. The constant is inert
 * here exactly as it is upstream — faithfully ported, not load-bearing.
 */
export function lambdaPairwise(opI: Operator, opJ: Operator): number {
  const base = lambdaIntrinsic(opJ);
  const interaction = Math.min(
    DISSIPATION_PAIRWISE_COEFFICIENT * Math.abs(commutatorMagnitude(opI, opJ)),
    DISSIPATION_MAX_INTERACTION,
  );
  return base + interaction;
}

function pairwiseLambdas(sequence: readonly Operator[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < sequence.length - 1; i += 1) {
    result.push(lambdaPairwise(sequence[i]!, sequence[i + 1]!));
  }
  return result;
}

export function lambdaEffective(sequence: readonly Operator[]): number {
  if (sequence.length < 2) return 0;
  const lambdas = pairwiseLambdas(sequence);
  return lambdas.reduce((sum, l) => sum + l, 0) / lambdas.length;
}

export function totalDissipationCost(sequence: readonly Operator[]): number {
  if (sequence.length < 2) return 0;
  return pairwiseLambdas(sequence).reduce((sum, l) => sum + l, 0);
}

export function predictDecay(
  D_initial: number,
  sequence: readonly Operator[],
  steps: number = sequence.length,
): number[] {
  const lambda = lambdaEffective(sequence);
  const decay: number[] = [];
  for (let t = 0; t <= steps; t += 1) {
    decay.push(D_initial * Math.exp(-lambda * t));
  }
  return decay;
}

export function analyzeSequence(sequence: readonly Operator[]): SequenceAnalysis {
  const lambda = lambdaEffective(sequence);
  const totalCost = totalDissipationCost(sequence);

  const pairwiseCosts: PairwiseCost[] = [];
  for (let i = 0; i < sequence.length - 1; i += 1) {
    pairwiseCosts.push({
      step: i,
      transition: `${sequence[i]} → ${sequence[i + 1]}`,
      lambda: lambdaPairwise(sequence[i]!, sequence[i + 1]!),
    });
  }

  const predictedDecay = predictDecay(1.0, sequence);
  const halfLife = lambda > 0 ? Math.log(2) / lambda : Infinity;

  return {
    sequence,
    lambdaEffective: lambda,
    totalCost,
    pairwiseCosts,
    predictedDecay,
    halfLife,
  };
}
