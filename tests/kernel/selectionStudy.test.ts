import { describe, expect, it } from "vitest";
import {
  compareTransitionFilter,
  formatTransitionFilterComparison,
} from "../../src/kernel/selectionStudy.js";
import { solve } from "../../src/kernel/solver.js";
import { suggestTransitionOperators } from "../../src/kernel/phasePortrait.js";

describe("compareTransitionFilter — mechanics", () => {
  it("leaves the unfiltered run identical to a plain solve", () => {
    const initial = { D: 0.45, C: 0.4 };
    const target = { D: 0.15, C: 0.1 };
    const comparison = compareTransitionFilter({ initial, target, beamWidth: 5 });
    expect(comparison.unfiltered).toEqual(solve({ initial, target, beamWidth: 5 }));
  });

  it("restricts the filtered run to the table's operators for the pair", () => {
    const comparison = compareTransitionFilter({
      initial: { D: 0.45, C: 0.4 },
      target: { D: 0.15, C: 0.1 },
      beamWidth: 5,
    });
    expect(comparison.candidates).toEqual(suggestTransitionOperators("S*", "J=0"));
    expect(comparison.filtered).not.toBeNull();
    for (const op of comparison.filtered!.sequence) {
      expect(comparison.candidates).toContain(op);
    }
  });

  it("reports unmapped without running a filtered search", () => {
    // procrastinating is S* → S*: the target (0.25, 0.20) gives V = 0.33, which
    // is not < 0.3, so both ends land in the same attractor and the table has
    // nothing to say.
    const comparison = compareTransitionFilter({
      initial: { D: 0.6, C: 0.5 },
      target: { D: 0.25, C: 0.2 },
      beamWidth: 10,
    });
    expect(comparison.from).toBe("S*");
    expect(comparison.to).toBe("S*");
    expect(comparison.verdict).toBe("unmapped");
    expect(comparison.candidates).toEqual([]);
    expect(comparison.filtered).toBeNull();
    expect(comparison.deltaJ).toBeNull();
  });

  it("ranks by arrival before J, so a filtered search that stops short loses", () => {
    // overwhelmed: the filtered set is all stabilizers, overshoots the target
    // and posts a *lower* J than the successful full search purely by paying
    // less dissipation on a path that never arrives.
    const comparison = compareTransitionFilter({
      initial: { D: 0.8, C: 0.8 },
      target: { D: 0.2, C: 0.15 },
      beamWidth: 10,
    });
    expect(comparison.unfiltered.success).toBe(true);
    expect(comparison.filtered!.success).toBe(false);
    expect(comparison.filtered!.cost).toBeLessThan(comparison.unfiltered.cost);
    expect(comparison.verdict).toBe("filter-failed");
  });
});

/**
 * FIXTURE — Phase 5.2 of the algebra/dynamics seam study, and the evidence the
 * 5.3 decision rests on. See docs/ALGEBRA_DYNAMICS_SEAM.md.
 *
 * The attractor transition table is a *semantic* selection mechanism that owes
 * nothing to the effect vectors, and the open question was whether it picks
 * better operators than vector-fit does within the degenerate clusters the
 * degeneracy report measures. Run as a candidate filter and scored by the
 * unchanged objective J, it does not: it never wins, once strands the search
 * short of the target, and otherwise costs 2–10% of J.
 *
 * This suite adopts nothing. It records the measurement so a later proposal to
 * wire the table into selection has to beat these numbers rather than restate
 * the argument.
 */
describe("compareTransitionFilter — the table as a candidate filter", () => {
  const cases = [
    {
      name: "stuck",
      initial: { D: 0.85, C: 0.75 },
      target: { D: 0.3, C: 0.35 },
      beamWidth: 10,
      verdict: "filter-worse",
      full: ["Axis", "Telo", "Telo"],
      restricted: ["Seed", "Seed", "Seed"],
    },
    {
      name: "overwhelmed",
      initial: { D: 0.8, C: 0.8 },
      target: { D: 0.2, C: 0.15 },
      beamWidth: 10,
      verdict: "filter-failed",
      full: ["Axis", "Telo", "Telo", "Telo", "Telo", "Telo", "Telo", "Flux"],
      restricted: ["Kata", "Latch", "Latch", "Latch"],
    },
    {
      name: "rigid",
      initial: { D: 0.15, C: 0.1 },
      target: { D: 0.5, C: 0.5 },
      beamWidth: 10,
      verdict: "filter-worse",
      full: ["Non", "Crux"],
      restricted: ["Para", "Para"],
    },
    {
      name: "collapsed",
      initial: { D: 0.95, C: 0.9 },
      target: { D: 0.4, C: 0.45 },
      beamWidth: 10,
      verdict: "filter-worse",
      full: ["Kata", "Weave", "Latch"],
      restricted: ["Weave", "Weave", "Weave"],
    },
    {
      name: "procrastinating",
      initial: { D: 0.6, C: 0.5 },
      target: { D: 0.25, C: 0.2 },
      beamWidth: 10,
      verdict: "unmapped",
      full: ["Kata", "Kata"],
      restricted: null,
    },
    {
      name: "nearly done",
      initial: { D: 0.3, C: 0.25 },
      target: { D: 0.15, C: 0.1 },
      beamWidth: 5,
      verdict: "filter-worse",
      full: ["Weave"],
      restricted: ["Latch"],
    },
    {
      name: "typical polish",
      initial: { D: 0.45, C: 0.4 },
      target: { D: 0.15, C: 0.1 },
      beamWidth: 5,
      verdict: "filter-worse",
      full: ["Weave", "Latch"],
      restricted: ["Latch", "Latch"],
    },
    {
      name: "rough draft",
      initial: { D: 0.6, C: 0.55 },
      target: { D: 0.15, C: 0.1 },
      beamWidth: 5,
      verdict: "filter-worse",
      full: ["Weave", "Latch", "Latch"],
      restricted: ["Latch", "Latch", "Latch"],
    },
    {
      name: "python parity",
      initial: { D: 0.6, C: 0.6 },
      target: { D: 0.2, C: 0.2 },
      beamWidth: 5,
      verdict: "identical",
      full: ["Kata", "Kata"],
      restricted: ["Kata", "Kata"],
    },
  ] as const;

  for (const c of cases) {
    it(`${c.name}: ${c.verdict}`, () => {
      const comparison = compareTransitionFilter({
        initial: c.initial,
        target: c.target,
        beamWidth: c.beamWidth,
      });
      expect(comparison.verdict).toBe(c.verdict);
      expect(comparison.unfiltered.sequence).toEqual(c.full);
      expect(comparison.filtered?.sequence ?? null).toEqual(c.restricted);
    });
  }

  it("never beats the full alphabet on any case measured", () => {
    const verdicts = cases.map((c) =>
      compareTransitionFilter({
        initial: c.initial,
        target: c.target,
        beamWidth: c.beamWidth,
      }).verdict,
    );
    expect(verdicts).not.toContain("filter-better");
    expect(verdicts).not.toContain("filter-rescued");
  });

  it("costs at most 10.3% of J where both searches arrive", () => {
    const penalties = cases
      .map((c) =>
        compareTransitionFilter({
          initial: c.initial,
          target: c.target,
          beamWidth: c.beamWidth,
        }),
      )
      .filter((c) => c.verdict === "filter-worse" || c.verdict === "identical")
      .map((c) => c.deltaJ! / c.unfiltered.cost);

    expect(penalties).toHaveLength(7);
    expect(Math.max(...penalties)).toBeCloseTo(0.1033, 3);
    expect(Math.min(...penalties)).toBe(0);
  });

  it("discriminates within a degenerate cluster — Weave vs Latch, 0.014 apart", () => {
    // The measurable payoff of the table, and the reason it is kept as an
    // instrument rather than discarded: the full search picks Weave and the
    // table picks Latch, on grounds the effect vectors cannot supply, because
    // to them the two operators are the same operator.
    const comparison = compareTransitionFilter({
      initial: { D: 0.45, C: 0.4 },
      target: { D: 0.15, C: 0.1 },
      beamWidth: 5,
    });
    expect(comparison.unfiltered.sequence[0]).toBe("Weave");
    expect(comparison.filtered!.sequence[0]).toBe("Latch");
    expect(comparison.candidates).not.toContain("Weave");
  });
});

describe("formatTransitionFilterComparison", () => {
  it("renders the pair, the verdict and both runs", () => {
    const text = formatTransitionFilterComparison(
      compareTransitionFilter({
        initial: { D: 0.45, C: 0.4 },
        target: { D: 0.15, C: 0.1 },
        beamWidth: 5,
      }),
    );
    expect(text).toContain("S* -> J=0");
    expect(text).toContain("[filter-worse]");
    expect(text).toContain("Weave Latch");
    expect(text).toContain("Latch Latch");
  });

  it("says why there is no filtered run when the pair is unmapped", () => {
    const text = formatTransitionFilterComparison(
      compareTransitionFilter({
        initial: { D: 0.6, C: 0.5 },
        target: { D: 0.25, C: 0.2 },
        beamWidth: 10,
      }),
    );
    expect(text).toContain("pair unmapped");
  });
});
