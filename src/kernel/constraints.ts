import type { Operator } from "./types.js";
import { OPERATORS } from "./types.js";

export const MAX_CONSECUTIVE_META = 2;

const VALE_TERMINAL_ALLOWED: readonly Operator[] = ["Kata", "Ortho", "Telo"];

export function trailingRunLength(sequence: readonly Operator[], op: Operator): number {
  let count = 0;
  for (let i = sequence.length - 1; i >= 0; i -= 1) {
    if (sequence[i] !== op) break;
    count += 1;
  }
  return count;
}

/**
 * Hard constraints on the *next* operator given the sequence so far.
 * Ported from inverse_solver.py `violates_constraints`, plus the CORE
 * addition (not present in the Python solver): Vale is never terminal —
 * if the last op was Vale, only Kata/Ortho/Telo may follow.
 */
export function violatesHardConstraint(sequence: readonly Operator[], next: Operator): boolean {
  const last = sequence.length > 0 ? sequence[sequence.length - 1]! : null;

  if (next === "Meta" && trailingRunLength(sequence, "Meta") >= MAX_CONSECUTIVE_META) {
    return true;
  }
  if (last === "Meta" && next === "Non") {
    return true;
  }
  if (last === "Non" && next === "Para") {
    return true;
  }
  if (last === "Vale" && !VALE_TERMINAL_ALLOWED.includes(next)) {
    return true;
  }

  return false;
}

/** "never end a committed sequence on Ana" — checked at bind() time, not legalNext. */
export function violatesSequenceEndConstraint(sequence: readonly Operator[]): boolean {
  if (sequence.length === 0) return false;
  return sequence[sequence.length - 1] === "Ana";
}

/** Mode-1 legalNext: all 20 operators filtered by the hard constraints above. */
export function legalNext(sequence: readonly Operator[]): Operator[] {
  return OPERATORS.filter((op) => !violatesHardConstraint(sequence, op));
}
