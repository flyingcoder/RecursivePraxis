import type { AttractorLabel, DissipationState, Operator } from "./types.js";
import { classifyAttractor, suggestTransitionOperators } from "./phasePortrait.js";
import { DEFAULT_BEAM_WIDTH, solve, type SolveResult } from "./solver.js";

/** Two J values within this of each other are reported as tied, not ranked. */
const J_TIE_EPSILON = 1e-9;

export type TransitionFilterVerdict =
  /** The attractor pair has no entry in the transition table; nothing to filter with. */
  | "unmapped"
  /** The filter changed nothing — the restricted search found the same sequence. */
  | "identical"
  /**
   * The restricted search never reached the target while the full one did. J is
   * *not* comparable across this boundary: a path that stops short pays no
   * further dissipation, so failing early can score lower than arriving. The
   * filter loses here regardless of the numbers, and `deltaJ` is reported for
   * completeness rather than as a ranking.
   */
  | "filter-failed"
  /** The inverse: the filter arrived where the full search only got close. */
  | "filter-rescued"
  | "filter-better"
  | "filter-worse"
  | "filter-tied";

export interface TransitionFilterComparison {
  readonly initial: DissipationState;
  readonly target: DissipationState;
  readonly from: AttractorLabel;
  readonly to: AttractorLabel;
  /** The transition table's operators for this pair; empty when unmapped. */
  readonly candidates: readonly Operator[];
  readonly unfiltered: SolveResult;
  /** `null` when unmapped — an empty candidate set is not a filter worth running. */
  readonly filtered: SolveResult | null;
  /** `filtered.cost − unfiltered.cost`, under the unchanged objective J. */
  readonly deltaJ: number | null;
  readonly verdict: TransitionFilterVerdict;
}

export interface TransitionFilterOptions {
  readonly initial: DissipationState;
  readonly target: DissipationState;
  readonly beamWidth?: number;
}

function verdictFor(
  unfiltered: SolveResult,
  filtered: SolveResult,
): TransitionFilterVerdict {
  const sameSequence =
    unfiltered.sequence.length === filtered.sequence.length &&
    unfiltered.sequence.every((op, i) => op === filtered.sequence[i]);
  if (sameSequence) return "identical";

  // Arrival is checked before J, because J does not contain it. A restricted
  // search that gives up early stops accumulating dissipation and can post the
  // lower number while never reaching the target.
  if (unfiltered.success !== filtered.success) {
    return filtered.success ? "filter-rescued" : "filter-failed";
  }

  const delta = filtered.cost - unfiltered.cost;
  if (Math.abs(delta) < J_TIE_EPSILON) return "filter-tied";
  return delta < 0 ? "filter-better" : "filter-worse";
}

/**
 * Runs the solver twice for one problem — once over the full operator alphabet,
 * once restricted to the operators the attractor transition table names for the
 * initial→target pair — and reports both.
 *
 * **This adopts nothing.** It is deliberately a comparison and not a change to
 * `solve`, because the divergence between what the algebra suggests and what
 * the dynamics computes is currently the only place the two are observable
 * against each other. Wiring the table into selection would make them agree and
 * destroy the measurement before it has been read. So the table is run as a
 * *candidate* here and its answers are scored by the same unchanged J the
 * default search is scored by, which is the only comparison that means
 * anything.
 *
 * Note what the filter is and is not. `suggestTransitionOperators` is keyed on
 * the *initial* attractor, so the candidate set is fixed for the whole search
 * even though the state crosses attractor boundaries as the sequence runs; a
 * filter recomputed per node would be a different experiment. And the table is
 * not above suspicion as data — it lists `Seed` as both a stabiliser and an
 * activator. It is a signal to evaluate, not a ground truth to adopt.
 */
export function compareTransitionFilter(
  options: TransitionFilterOptions,
): TransitionFilterComparison {
  const { initial, target } = options;
  // Resolved once so both runs provably search at the same width — the
  // comparison is meaningless if they do not.
  const beamWidth = options.beamWidth ?? DEFAULT_BEAM_WIDTH;
  const from = classifyAttractor(initial.D, initial.C);
  const to = classifyAttractor(target.D, target.C);
  const candidates = suggestTransitionOperators(from, to);

  const unfiltered = solve({ initial, target, beamWidth });

  if (candidates.length === 0) {
    return {
      initial,
      target,
      from,
      to,
      candidates,
      unfiltered,
      filtered: null,
      deltaJ: null,
      verdict: "unmapped",
    };
  }

  const filtered = solve({ initial, target, beamWidth, candidates });

  return {
    initial,
    target,
    from,
    to,
    candidates,
    unfiltered,
    filtered,
    deltaJ: filtered.cost - unfiltered.cost,
    verdict: verdictFor(unfiltered, filtered),
  };
}

function describe(result: SolveResult): string {
  const sequence = result.sequence.join(" ") || "(empty)";
  return `${sequence}  J=${result.cost.toFixed(4)} ${result.success ? "ok" : "partial"}`;
}

/** One comparison as three aligned lines, for a report or a commit message. */
export function formatTransitionFilterComparison(
  comparison: TransitionFilterComparison,
): string {
  const header = `${comparison.from} -> ${comparison.to}  [${comparison.verdict}]`;
  const unfiltered = `  full      ${describe(comparison.unfiltered)}`;
  const filtered =
    comparison.filtered === null
      ? "  filtered  (no candidates — pair unmapped)"
      : `  filtered  ${describe(comparison.filtered)}   from {${comparison.candidates.join(", ")}}`;

  return [header, unfiltered, filtered].join("\n");
}
