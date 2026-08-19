/**
 * CORE Step 5 hard constraints — pure reject (no soft-warning path).
 */

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

const VALE_STABILIZERS = new Set(["Kata", "Ortho", "Telo"]);

function reject(constraint: ConstraintId, reason: string): CheckReject {
  return { accepted: false, constraint, reason };
}

/**
 * Validate an operator-name sequence against CORE Step 5.
 * Names are expected to be canonical CORE spellings (caller may resolve case).
 */
export function checkForbiddenSequence(ops: readonly string[]): CheckResult {
  if (ops.length === 0) {
    return reject(CONSTRAINT.END_ON_ANA, "reject: empty sequence");
  }

  let metaRun = 0;
  for (let i = 0; i < ops.length; i++) {
    const cur = ops[i]!;
    const prev = i > 0 ? ops[i - 1]! : undefined;

    if (cur === "Meta") {
      metaRun += 1;
      if (metaRun > 2) {
        return reject(
          CONSTRAINT.META_MAX_TWO,
          "reject: at most two consecutive Meta",
        );
      }
    } else {
      metaRun = 0;
    }

    if (prev === "Meta" && cur === "Non") {
      return reject(
        CONSTRAINT.META_THEN_NON,
        "reject: Non immediately after Meta",
      );
    }

    if (prev === "Non" && cur === "Para") {
      return reject(
        CONSTRAINT.NON_THEN_PARA,
        "reject: Para immediately after Non",
      );
    }

    if (prev === "Vale" && !VALE_STABILIZERS.has(cur)) {
      return reject(
        CONSTRAINT.VALE_STABILIZER,
        "reject: Vale lacks a following stabilizer (Kata, Ortho, or Telo)",
      );
    }
  }

  const last = ops[ops.length - 1]!;
  if (last === "Ana") {
    return reject(CONSTRAINT.END_ON_ANA, "reject: ending on Ana");
  }
  if (last === "Vale") {
    return reject(
      CONSTRAINT.VALE_STABILIZER,
      "reject: Vale lacks a following stabilizer (Kata, Ortho, or Telo)",
    );
  }

  return { accepted: true };
}
