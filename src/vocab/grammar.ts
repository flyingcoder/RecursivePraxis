/**
 * Sequence grammar hard constraints — pure reject (no soft-warning path).
 * The accept/reject decision itself is delegated to the ported kernel
 * (src/kernel/constraints.ts: violatesHardConstraint/violatesSequenceEndConstraint),
 * which is now the single source of truth for the grammar. This module keeps
 * its prior CONSTRAINT/CheckResult public contract and attaches a specific
 * named reason for CLI/test consumers.
 */

import {
  MAX_CONSECUTIVE_META,
  trailingRunLength,
  violatesHardConstraint,
  violatesSequenceEndConstraint,
  type Operator,
} from "../kernel/index.js";

export const CONSTRAINT = {
  META_MAX_TWO: "meta-max-two-consecutive",
  META_THEN_NON: "non-immediately-after-meta",
  NON_THEN_PARA: "para-immediately-after-non",
  END_ON_ANA: "end-on-ana",
  VALE_STABILIZER: "vale-requires-stabilizer",
} as const;

export type ConstraintId = (typeof CONSTRAINT)[keyof typeof CONSTRAINT];

export type CheckOk = { readonly accepted: true };
export type CheckReject = {
  readonly accepted: false;
  readonly constraint: ConstraintId;
  readonly reason: string;
};
export type CheckResult = CheckOk | CheckReject;

function reject(constraint: ConstraintId, reason: string): CheckReject {
  return { accepted: false, constraint, reason };
}

const VALE_STABILIZER_REASON = "reject: Vale lacks a following stabilizer (Kata, Ortho, or Telo)";

/** One rule broken, and where. `index` is the position of the operator that
 * breaks it; end-of-sequence rules report the last position. */
export interface SequenceViolation {
  readonly index: number;
  readonly operator: Operator;
  readonly constraint: ConstraintId;
  readonly reason: string;
}

/** Names the specific sequence-grammar rule behind a kernel violatesHardConstraint()
 * rejection, so the CLI can report a stable constraint id and reason. */
function namedStepViolation(
  index: number,
  prefix: readonly Operator[],
  cur: Operator,
): SequenceViolation {
  const at = { index, operator: cur };
  if (cur === "Meta" && trailingRunLength(prefix, "Meta") >= MAX_CONSECUTIVE_META) {
    return { ...at, constraint: CONSTRAINT.META_MAX_TWO, reason: "reject: at most two consecutive Meta" };
  }
  const prev = prefix.length > 0 ? prefix[prefix.length - 1] : undefined;
  if (prev === "Meta" && cur === "Non") {
    return { ...at, constraint: CONSTRAINT.META_THEN_NON, reason: "reject: Non immediately after Meta" };
  }
  if (prev === "Non" && cur === "Para") {
    return { ...at, constraint: CONSTRAINT.NON_THEN_PARA, reason: "reject: Para immediately after Non" };
  }
  return { ...at, constraint: CONSTRAINT.VALE_STABILIZER, reason: VALE_STABILIZER_REASON };
}

/**
 * Every grammar rule the sequence breaks, in position order.
 *
 * `checkForbiddenSequence` reports the first of these and stops, which is the
 * right shape for a gate. A *report* — `lambda analyze`, the chain reading —
 * wants all of them, and used to get there by re-implementing the pair scan
 * against its own copy of the rules. This is the one scan both use.
 *
 * An empty sequence has no violations to enumerate; rejecting it is a property
 * of the gate below, not of the grammar.
 */
export function sequenceViolations(ops: readonly string[]): readonly SequenceViolation[] {
  const sequence = ops as readonly Operator[];
  const violations: SequenceViolation[] = [];

  for (let i = 0; i < sequence.length; i++) {
    const cur = sequence[i]!;
    const prefix = sequence.slice(0, i);
    if (violatesHardConstraint(prefix, cur)) {
      violations.push(namedStepViolation(i, prefix, cur));
    }
  }

  const lastIndex = sequence.length - 1;
  const last = lastIndex >= 0 ? sequence[lastIndex]! : undefined;
  if (last !== undefined && violatesSequenceEndConstraint(sequence)) {
    violations.push({
      index: lastIndex,
      operator: last,
      constraint: CONSTRAINT.END_ON_ANA,
      reason: "reject: ending on Ana",
    });
  }
  if (last === "Vale") {
    violations.push({
      index: lastIndex,
      operator: last,
      constraint: CONSTRAINT.VALE_STABILIZER,
      reason: VALE_STABILIZER_REASON,
    });
  }

  return violations;
}

/**
 * Validate an operator-name sequence against the sequence grammar.
 * Names are expected to be canonical operator spellings (caller may resolve case).
 */
export function checkForbiddenSequence(ops: readonly string[]): CheckResult {
  if (ops.length === 0) {
    return reject(CONSTRAINT.END_ON_ANA, "reject: empty sequence");
  }

  const first = sequenceViolations(ops)[0];
  return first === undefined ? { accepted: true } : reject(first.constraint, first.reason);
}
