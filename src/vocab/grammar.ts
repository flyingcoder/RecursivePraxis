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

/** Names the specific sequence-grammar rule behind a kernel violatesHardConstraint()
 * rejection, so the CLI can report a stable constraint id and reason. */
function namedStepRejection(prefix: readonly Operator[], cur: Operator): CheckReject {
  if (cur === "Meta" && trailingRunLength(prefix, "Meta") >= MAX_CONSECUTIVE_META) {
    return reject(CONSTRAINT.META_MAX_TWO, "reject: at most two consecutive Meta");
  }
  const prev = prefix.length > 0 ? prefix[prefix.length - 1] : undefined;
  if (prev === "Meta" && cur === "Non") {
    return reject(CONSTRAINT.META_THEN_NON, "reject: Non immediately after Meta");
  }
  if (prev === "Non" && cur === "Para") {
    return reject(CONSTRAINT.NON_THEN_PARA, "reject: Para immediately after Non");
  }
  return reject(
    CONSTRAINT.VALE_STABILIZER,
    "reject: Vale lacks a following stabilizer (Kata, Ortho, or Telo)",
  );
}

/**
 * Validate an operator-name sequence against the sequence grammar.
 * Names are expected to be canonical operator spellings (caller may resolve case).
 */
export function checkForbiddenSequence(ops: readonly string[]): CheckResult {
  if (ops.length === 0) {
    return reject(CONSTRAINT.END_ON_ANA, "reject: empty sequence");
  }

  const sequence = ops as readonly Operator[];

  for (let i = 0; i < sequence.length; i++) {
    const cur = sequence[i]!;
    const prefix = sequence.slice(0, i);
    if (violatesHardConstraint(prefix, cur)) {
      return namedStepRejection(prefix, cur);
    }
  }

  if (violatesSequenceEndConstraint(sequence)) {
    return reject(CONSTRAINT.END_ON_ANA, "reject: ending on Ana");
  }
  if (sequence[sequence.length - 1] === "Vale") {
    return reject(
      CONSTRAINT.VALE_STABILIZER,
      "reject: Vale lacks a following stabilizer (Kata, Ortho, or Telo)",
    );
  }

  return { accepted: true };
}
