/**
 * Sequence normalization: the pass between a raw solver trajectory and a
 * compiled execution program.
 *
 * `solve()` optimizes terminal distance plus dissipation cost, where
 * repetition is cheap. Real output from this engine looks like:
 *
 *   Telo ∘ Telo ∘ Telo ∘ Telo ∘ Telo ∘ Para ∘ Crux ∘ Crux ∘ Crux ∘ Telo ∘ Para ∘ Crux
 *
 * That is a valid trajectory in (D, C) space and a useless list of cognitive
 * instructions. This module collapses runs into a single instruction carrying
 * an iteration count (intensity, not repetition), and reports how much of the
 * 20-operator alphabet the sequence actually used, so a degenerate solve
 * surfaces as a flag instead of being laundered into confident prose.
 *
 * Proposed in docs/suggestions/operator-sequence-to-execution-language.md (§5).
 */

import type { Operator } from "../kernel/index.js";

export interface OperatorRun {
  readonly op: Operator;
  /** How many consecutive occurrences collapsed into this run. */
  readonly iterations: number;
  /** Positions in the raw sequence this run covers, for replay. */
  readonly sourceIndices: readonly number[];
}

export interface AlphabetCoverage {
  readonly length: number;
  readonly distinctOperators: number;
  /** distinctOperators / length, in [0, 1]. */
  readonly ratio: number;
  readonly degenerate: boolean;
}

export interface NormalizedSequence {
  /** The untouched input, retained so replay keeps its subject. */
  readonly raw: readonly Operator[];
  readonly runs: readonly OperatorRun[];
  readonly coverage: AlphabetCoverage;
  readonly notes: readonly string[];
}

/** Below this distinct/length ratio a sequence reads as solver repetition. */
export const COVERAGE_WARN_RATIO = 0.5;

/** Short sequences repeat for legitimate reasons; only judge longer ones. */
export const COVERAGE_MIN_LENGTH = 6;

function collapseRuns(sequence: readonly Operator[]): OperatorRun[] {
  const runs: OperatorRun[] = [];
  for (let index = 0; index < sequence.length; index += 1) {
    const op = sequence[index]!;
    const previous = runs[runs.length - 1];
    if (previous && previous.op === op) {
      runs[runs.length - 1] = {
        op,
        iterations: previous.iterations + 1,
        sourceIndices: [...previous.sourceIndices, index],
      };
      continue;
    }
    runs.push({ op, iterations: 1, sourceIndices: [index] });
  }
  return runs;
}

function coverageOf(sequence: readonly Operator[]): AlphabetCoverage {
  const length = sequence.length;
  const distinctOperators = new Set(sequence).size;
  const ratio = length === 0 ? 0 : distinctOperators / length;
  return {
    length,
    distinctOperators,
    ratio,
    degenerate: length >= COVERAGE_MIN_LENGTH && ratio < COVERAGE_WARN_RATIO,
  };
}

function notesFor(runs: readonly OperatorRun[], coverage: AlphabetCoverage): string[] {
  const notes: string[] = [];

  if (coverage.degenerate) {
    notes.push(
      `low alphabet coverage: ${coverage.distinctOperators} distinct operators across ` +
        `${coverage.length} steps — likely poorly chosen initial/target (D, C), not a plan`,
    );
  }

  for (const run of runs) {
    if (run.iterations === 1) continue;
    notes.push(
      `collapsed ${run.iterations}× ${run.op} (steps ${run.sourceIndices.join(", ")}) ` +
        `into one instruction — read as intensity, not as ${run.iterations} distinct acts`,
    );
  }

  return notes;
}

export function normalizeSequence(sequence: readonly Operator[]): NormalizedSequence {
  const runs = collapseRuns(sequence);
  const coverage = coverageOf(sequence);
  return { raw: sequence, runs, coverage, notes: notesFor(runs, coverage) };
}
