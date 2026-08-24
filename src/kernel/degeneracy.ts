import type { Operator } from "./types.js";
import { OPERATORS } from "./types.js";
import { lambdaIntrinsic } from "./formalism.js";
import { DEFAULT_OPERATOR_EFFECTS, type OperatorEffects } from "./phasePortrait.js";
import { DISTANCE_THRESHOLD } from "./solver.js";

/**
 * A second, tighter band than the solver's arrival threshold. It has no
 * derivation — it is the round number the original measurement used, kept so
 * the counts stay comparable across tables, and it answers a different question
 * than `DISTANCE_THRESHOLD` does: not "are these two operators
 * indistinguishable to the search" but "are they nearly the same vector".
 */
export const DEGENERACY_TIGHT_THRESHOLD = 0.05;

export interface OperatorPairDegeneracy {
  readonly a: Operator;
  readonly b: Operator;
  /** Euclidean distance between the two operators' `(ΔD, ΔC)` displacements. */
  readonly effectDistance: number;
  /** `|λ_a − λ_b|` over `lambda_intrinsic` — the only other per-operator scalar. */
  readonly lambdaGap: number;
}

export interface DegeneracyReport {
  /** All unordered pairs, ascending by `effectDistance`. */
  readonly pairs: readonly OperatorPairDegeneracy[];
  readonly totalPairs: number;
  /**
   * Pairs closer together than the distance at which the solver declares it has
   * *arrived* at its target. Every pair counted here names two operators the
   * search cannot tell apart by their effect on state.
   */
  readonly belowArrivalThreshold: number;
  /** Pairs closer than `DEGENERACY_TIGHT_THRESHOLD`. */
  readonly belowTightThreshold: number;
}

/**
 * How much of the operator alphabet an effects table can actually distinguish.
 *
 * This is an instrument, not a check: nothing consults it at runtime and it
 * changes no behaviour. It exists because the per-operator `(ΔD, ΔC)` vectors
 * are the one non-relational artifact in an otherwise relational framework —
 * generated from operator class with hand-chosen magnitudes, calibrated against
 * nothing (see the provenance note on `DEFAULT_OPERATOR_EFFECTS`) — and the
 * solver uses exactly that data to choose operators. Measuring the degeneracy
 * gives any proposed replacement table a number to be judged against instead of
 * an argument.
 *
 * Reading the default table: 62 of 190 pairs sit closer together than the
 * solver's own arrival threshold, and 33 are closer than half of it. Operator
 * identity is finer-grained than the distance the search treats as zero, so for
 * a third of the alphabet "which operator" is decided by rounding rather than
 * by meaning. `Seed ~ Latch` (genesis and lock) are 0.010 apart. That is the
 * measurement; what to do about it is a separate question, deliberately left
 * open — see docs/ALGEBRA_DYNAMICS_SEAM.md.
 */
export function degeneracyReport(
  effects: OperatorEffects = DEFAULT_OPERATOR_EFFECTS,
): DegeneracyReport {
  const pairs: OperatorPairDegeneracy[] = [];

  for (let i = 0; i < OPERATORS.length; i += 1) {
    for (let j = i + 1; j < OPERATORS.length; j += 1) {
      const a = OPERATORS[i]!;
      const b = OPERATORS[j]!;
      const [aD, aC] = effects[a];
      const [bD, bC] = effects[b];

      pairs.push({
        a,
        b,
        effectDistance: Math.hypot(aD - bD, aC - bC),
        lambdaGap: Math.abs(lambdaIntrinsic(a) - lambdaIntrinsic(b)),
      });
    }
  }

  // Ties are broken by name so the report is a stable fixture: four pairs sit
  // at exactly 0.010 under the default table.
  const sorted = [...pairs].sort(
    (x, y) => x.effectDistance - y.effectDistance || `${x.a}${x.b}`.localeCompare(`${y.a}${y.b}`),
  );

  return {
    pairs: sorted,
    totalPairs: sorted.length,
    belowArrivalThreshold: sorted.filter((p) => p.effectDistance < DISTANCE_THRESHOLD).length,
    belowTightThreshold: sorted.filter((p) => p.effectDistance < DEGENERACY_TIGHT_THRESHOLD).length,
  };
}

/** The report's headline as a fixed-width block, for a CLI or a commit message. */
export function formatDegeneracyReport(report: DegeneracyReport, topN = 10): string {
  const lines = report.pairs
    .slice(0, topN)
    .map(
      (p) =>
        `  ${`${p.a} ~ ${p.b}`.padEnd(18)}${p.effectDistance.toFixed(3)}   |Δλ| ${p.lambdaGap.toFixed(2)}`,
    );

  return [
    `${report.belowArrivalThreshold} of ${report.totalPairs} pairs closer than the arrival threshold (${DISTANCE_THRESHOLD})`,
    `${report.belowTightThreshold} of ${report.totalPairs} closer than ${DEGENERACY_TIGHT_THRESHOLD}`,
    "",
    ...lines,
  ].join("\n");
}
