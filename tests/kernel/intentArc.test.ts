import { describe, expect, it } from "vitest";
import {
  BAND_MARGIN,
  numbersForLabel,
  operatorsNamedIn,
  planArc,
  verifyArc,
} from "../../src/kernel/intentArc.js";
import {
  STABILITY_THRESHOLD,
  VOID_C_THRESHOLD,
  VOID_D_THRESHOLD,
  classifyAttractor,
  suggestTransitionOperators,
} from "../../src/kernel/phasePortrait.js";
import { STABLE_TARGET_DISSIPATION } from "../../src/kernel/derive.js";
import type { AttractorLabel } from "../../src/kernel/types.js";

const LABELS = ["J=0", "S*", "∅"] as const satisfies readonly AttractorLabel[];

describe("numbersForLabel", () => {
  it("returns a point inside the band it names", () => {
    for (const label of LABELS) {
      const state = numbersForLabel(label);
      expect(classifyAttractor(state.D, state.C)).toBe(label);
    }
  });

  it("is deterministic — the same label always yields the same point", () => {
    // The document leaves the free axis to the author. A tool cannot take that
    // freedom and stay reproducible, so the choice is resolved once.
    for (const label of LABELS) {
      expect(numbersForLabel(label)).toEqual(numbersForLabel(label));
    }
  });

  it("holds each point clear of the threshold that defines its band", () => {
    // A point sitting on a threshold classifies by float comparison, and the
    // arithmetic really does land there: 0.3 - 0.4 * 0.5 is 0.09999999999999998.
    expect(numbersForLabel("∅").D - VOID_D_THRESHOLD).toBeCloseTo(BAND_MARGIN, 10);
    expect(BAND_MARGIN).toBeGreaterThanOrEqual(0.02);

    const agitated = numbersForLabel("S*");
    expect(agitated.D - STABILITY_THRESHOLD).toBeGreaterThanOrEqual(BAND_MARGIN);
    expect(VOID_D_THRESHOLD - agitated.D).toBeGreaterThanOrEqual(BAND_MARGIN);
    expect(VOID_C_THRESHOLD - agitated.C).toBeGreaterThanOrEqual(BAND_MARGIN);
  });

  it("reuses the engine's standing target for the stable band", () => {
    expect(numbersForLabel("J=0")).toEqual(STABLE_TARGET_DISSIPATION);
  });
});

describe("planArc", () => {
  it("marks exactly the same-label arcs as unmapped", () => {
    // The formalism maps all six cross-label pairs and none of the three
    // same-label ones; planArc must report that rather than paper over it.
    for (const from of LABELS) {
      for (const to of LABELS) {
        const plan = planArc(numbersForLabel(from), to);
        expect(plan.sameLabel).toBe(from === to);
        expect(plan.suggested).toEqual(suggestTransitionOperators(from, to));
      }
    }
  });

  it("falls back to the engine's standing target when none is stated", () => {
    const plan = planArc({ D: 0.85, C: 0.75 });
    expect(plan.targetWasDefaulted).toBe(true);
    expect(plan.target).toEqual(STABLE_TARGET_DISSIPATION);
    expect(plan.targetLabel).toBe("J=0");
  });

  it("flags only the arcs that run toward a costlier attractor", () => {
    expect(planArc(numbersForLabel("J=0"), "∅").towardCostlierAttractor).toBe(true);
    expect(planArc(numbersForLabel("J=0"), "S*").towardCostlierAttractor).toBe(true);
    expect(planArc(numbersForLabel("∅"), "J=0").towardCostlierAttractor).toBe(false);
    expect(planArc(numbersForLabel("S*"), "S*").towardCostlierAttractor).toBe(false);
  });
});

describe("operatorsNamedIn", () => {
  it("finds operator names in the shipped diagnosis style", () => {
    expect(operatorsNamedIn("Meta ∘ Meta loop (infinite reflection)")).toEqual(["Meta"]);
    expect(operatorsNamedIn("Excessive Ana without Kata (no compression)")).toEqual(["Ana", "Kata"]);
  });

  it("does not match an operator name embedded in a longer word", () => {
    // "Metaphor" is not Meta; a substring match here would flag a diagnosis
    // that never named an operator at all.
    expect(operatorsNamedIn("a metaphor for Proximity")).toEqual([]);
  });

  it("finds nothing in a diagnosis that names no operator", () => {
    expect(operatorsNamedIn("In the Void, need rescue operators")).toEqual([]);
  });
});

describe("verifyArc", () => {
  it("rejects a claimed label the kernel disagrees with", () => {
    expect(() =>
      verifyArc({
        initial: { D: 0.85, C: 0.75 },
        target: STABLE_TARGET_DISSIPATION,
        initialLabel: "S*",
      }),
    ).toThrow(/classifies as ∅, not the claimed S\*/);

    expect(() =>
      verifyArc({
        initial: { D: 0.85, C: 0.75 },
        target: STABLE_TARGET_DISSIPATION,
        targetLabel: "∅",
      }),
    ).toThrow(/classifies as J=0, not the claimed ∅/);
  });

  it("separates 'nothing to do' from a solved plan", () => {
    const arrived = verifyArc({
      initial: { D: 0.15, C: 0.13 },
      target: STABLE_TARGET_DISSIPATION,
    });
    expect(arrived.success).toBe(true);
    expect(arrived.alreadyWithinRadius).toBe(true);
    expect(arrived.sequence).toEqual([]);

    const solved = verifyArc({
      initial: { D: 0.85, C: 0.75 },
      target: STABLE_TARGET_DISSIPATION,
    });
    expect(solved.alreadyWithinRadius).toBe(false);
    expect(solved.sequence.length).toBeGreaterThan(0);
  });

  it("keeps `partial` the strict complement of `success`", () => {
    const result = verifyArc({ initial: { D: 0.9, C: 0.9 }, target: { D: 0.1, C: 0.1 } });
    expect(result.partial).toBe(!result.success);
  });

  it("flags a diagnosis operator the solver never uses, without altering the sequence", () => {
    const result = verifyArc({
      initial: { D: 0.85, C: 0.75 },
      target: { D: 0.3, C: 0.35 },
      diagnosis: "Meta ∘ Meta loop (infinite reflection)",
    });
    const plain = verifyArc({ initial: { D: 0.85, C: 0.75 }, target: { D: 0.3, C: 0.35 } });

    expect(result.unusedDiagnosisOperators).toEqual(["Meta"]);
    // The flag is a report. Passing a diagnosis must not change what is solved.
    expect(result.sequence).toEqual(plain.sequence);
  });
});
