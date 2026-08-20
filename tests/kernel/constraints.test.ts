import { describe, expect, it } from "vitest";
import {
  legalNext,
  trailingRunLength,
  violatesHardConstraint,
  violatesSequenceEndConstraint,
} from "../../src/kernel/constraints.js";
import { OPERATORS } from "../../src/kernel/types.js";

describe("trailingRunLength", () => {
  it("counts the trailing run of a given operator", () => {
    expect(trailingRunLength(["Ana", "Meta", "Meta"], "Meta")).toBe(2);
    expect(trailingRunLength(["Meta", "Meta", "Ana"], "Meta")).toBe(0);
    expect(trailingRunLength([], "Meta")).toBe(0);
  });
});

describe("violatesHardConstraint", () => {
  it("forbids a 3rd consecutive Meta", () => {
    expect(violatesHardConstraint(["Ana", "Meta", "Meta"], "Meta")).toBe(true);
    expect(violatesHardConstraint(["Ana", "Meta"], "Meta")).toBe(false);
  });

  it("forbids Meta -> Non", () => {
    expect(violatesHardConstraint(["Ana", "Meta"], "Non")).toBe(true);
  });

  it("forbids Non -> Para", () => {
    expect(violatesHardConstraint(["Ana", "Non"], "Para")).toBe(true);
  });

  it("restricts Vale's next step to Kata, Ortho, or Telo (never terminal)", () => {
    expect(violatesHardConstraint(["Ana", "Vale"], "Kata")).toBe(false);
    expect(violatesHardConstraint(["Ana", "Vale"], "Ortho")).toBe(false);
    expect(violatesHardConstraint(["Ana", "Vale"], "Telo")).toBe(false);
    expect(violatesHardConstraint(["Ana", "Vale"], "Meta")).toBe(true);
    expect(violatesHardConstraint(["Ana", "Vale"], "Pro")).toBe(true);
  });

  it("allows an otherwise-unconstrained transition", () => {
    expect(violatesHardConstraint(["Ana"], "Kata")).toBe(false);
  });
});

describe("violatesSequenceEndConstraint", () => {
  it("flags a sequence that ends on Ana", () => {
    expect(violatesSequenceEndConstraint(["Meta", "Ana"])).toBe(true);
  });

  it("allows a sequence that does not end on Ana", () => {
    expect(violatesSequenceEndConstraint(["Ana", "Kata"])).toBe(false);
  });

  it("allows an empty sequence (handled separately by bind's own emptiness check)", () => {
    expect(violatesSequenceEndConstraint([])).toBe(false);
  });
});

describe("legalNext (Mode 1, sequence-only)", () => {
  it("returns all 20 operators with no history", () => {
    expect(legalNext([]).sort()).toEqual([...OPERATORS].sort());
  });

  it("excludes Meta and Non after two consecutive Metas", () => {
    const next = legalNext(["Ana", "Meta", "Meta"]);
    expect(next).not.toContain("Meta");
    expect(next).not.toContain("Non");
    expect(next.length).toBe(18);
  });

  it("excludes Para after Non", () => {
    const next = legalNext(["Ana", "Non"]);
    expect(next).not.toContain("Para");
  });

  it("restricts to exactly {Kata, Ortho, Telo} after Vale", () => {
    const next = legalNext(["Ana", "Vale"]).sort();
    expect(next).toEqual(["Kata", "Ortho", "Telo"].sort());
  });
});
