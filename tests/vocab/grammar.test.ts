import { describe, expect, it } from "vitest";
import { CONSTRAINT, checkForbiddenSequence, sequenceViolations } from "../../src/vocab/grammar.js";

/**
 * `checkForbiddenSequence` is the gate and `sequenceViolations` is the report;
 * both now run the same scan. Before that, every caller that wanted all the
 * violations rather than the first re-implemented the pair checks against its
 * own copy of the rules, and quietly missed the ones it had not copied.
 */
describe("the gate and the report agree", () => {
  it("rejects on the first violation the report lists", () => {
    const sequence = ["Meta", "Non", "Non", "Para", "Kata"];
    const verdict = checkForbiddenSequence(sequence);
    const violations = sequenceViolations(sequence);

    expect(verdict.accepted).toBe(false);
    expect(verdict.accepted === false && verdict.constraint).toBe(violations[0]!.constraint);
    expect(violations[0]!.constraint).toBe(CONSTRAINT.META_THEN_NON);
  });

  it("accepts exactly when the report is empty", () => {
    const sequence = ["Axis", "Ana", "Pro", "Kata", "Latch"];
    expect(sequenceViolations(sequence)).toEqual([]);
    expect(checkForbiddenSequence(sequence).accepted).toBe(true);
  });

  it("still rejects an empty sequence, which has no violation to enumerate", () => {
    expect(sequenceViolations([])).toEqual([]);
    const verdict = checkForbiddenSequence([]);
    expect(verdict.accepted).toBe(false);
    expect(verdict.accepted === false && verdict.reason).toContain("empty");
  });
});

describe("enumerating every violation", () => {
  it("reports each broken rule with the position of the operator that broke it", () => {
    const violations = sequenceViolations(["Meta", "Non", "Para", "Kata"]);
    expect(violations).toEqual([
      { index: 1, operator: "Non", constraint: CONSTRAINT.META_THEN_NON, reason: expect.any(String) },
      { index: 2, operator: "Para", constraint: CONSTRAINT.NON_THEN_PARA, reason: expect.any(String) },
    ]);
  });

  it("counts consecutive Meta rather than total Meta", () => {
    expect(sequenceViolations(["Meta", "Meta", "Kata", "Meta"])).toEqual([]);
    expect(sequenceViolations(["Meta", "Meta", "Meta"]).map((v) => v.constraint)).toEqual([
      CONSTRAINT.META_MAX_TWO,
    ]);
  });

  it("reports the end-of-sequence rules against the last position", () => {
    const onAna = sequenceViolations(["Kata", "Ana"]);
    expect(onAna).toEqual([
      { index: 1, operator: "Ana", constraint: CONSTRAINT.END_ON_ANA, reason: expect.any(String) },
    ]);

    const onVale = sequenceViolations(["Kata", "Vale"]);
    expect(onVale.map((v) => v.constraint)).toEqual([CONSTRAINT.VALE_STABILIZER]);
  });
});
