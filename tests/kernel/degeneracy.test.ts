import { describe, expect, it } from "vitest";
import {
  DEGENERACY_TIGHT_THRESHOLD,
  degeneracyReport,
  formatDegeneracyReport,
} from "../../src/kernel/degeneracy.js";
import {
  DEFAULT_OPERATOR_EFFECTS,
  type OperatorEffects,
} from "../../src/kernel/phasePortrait.js";
import { OPERATORS } from "../../src/kernel/types.js";
import { DISTANCE_THRESHOLD } from "../../src/kernel/solver.js";

describe("degeneracyReport — structure", () => {
  it("covers every unordered pair exactly once", () => {
    const report = degeneracyReport();
    const n = OPERATORS.length;
    expect(report.totalPairs).toBe((n * (n - 1)) / 2);
    expect(report.pairs).toHaveLength(report.totalPairs);

    const keys = new Set(report.pairs.map((p) => [p.a, p.b].sort().join("|")));
    expect(keys.size).toBe(report.totalPairs);
    expect(report.pairs.every((p) => p.a !== p.b)).toBe(true);
  });

  it("orders pairs ascending by effect distance", () => {
    const distances = degeneracyReport().pairs.map((p) => p.effectDistance);
    const ascending = [...distances].sort((x, y) => x - y);
    expect(distances).toEqual(ascending);
  });

  it("measures the injected table, not the default one", () => {
    // Every operator on the same vector: perfectly degenerate by construction.
    const flat = Object.fromEntries(
      OPERATORS.map((op) => [op, [0.1, 0.1] as const]),
    ) as OperatorEffects;

    const report = degeneracyReport(flat);
    expect(report.belowTightThreshold).toBe(report.totalPairs);
    expect(report.pairs.every((p) => p.effectDistance === 0)).toBe(true);
    // λ is read from the formalism, not the effects table, so it still varies.
    expect(report.pairs.some((p) => p.lambdaGap > 0)).toBe(true);
  });
});

/**
 * FIXTURE — the metric any replacement effects table is judged against.
 *
 * These are not arbitrary pins. `DEFAULT_OPERATOR_EFFECTS` is generated from
 * operator class with hand-chosen magnitudes and is calibrated against nothing,
 * and this is the measurement of what that costs: a third of the alphabet is
 * closer together than the distance at which the solver declares it has
 * arrived. `Seed ~ Latch` — genesis and lock — are 0.010 apart, which is under
 * a tenth of the arrival threshold.
 *
 * If these numbers move, the effects table moved. That is allowed; it is the
 * point of the table being injectable. It is not allowed to happen silently.
 */
describe("degeneracyReport — the default table's degeneracy", () => {
  const report = degeneracyReport(DEFAULT_OPERATOR_EFFECTS);

  it("has 62 of 190 pairs closer than the solver's arrival threshold", () => {
    expect(report.totalPairs).toBe(190);
    expect(DISTANCE_THRESHOLD).toBe(0.12);
    expect(report.belowArrivalThreshold).toBe(62);
  });

  it("has 33 of 190 pairs closer than 0.05", () => {
    expect(DEGENERACY_TIGHT_THRESHOLD).toBe(0.05);
    expect(report.belowTightThreshold).toBe(33);
  });

  it("pins the four tightest pairs, all at 0.010 apart", () => {
    const tightest = report.pairs.slice(0, 4).map((p) => `${p.a}~${p.b}`);
    expect(tightest).toEqual(["Seed~Latch", "Axis~Latch", "Ortho~Axis", "Weave~Axis"]);
    for (const pair of report.pairs.slice(0, 4)) {
      expect(pair.effectDistance).toBeCloseTo(0.01, 10);
    }
  });

  it("finds Ana ~ Flux the one near-degenerate pair λ separates", () => {
    // 0.0141 apart in effect space but |Δλ| = 0.15 — several times the
    // λ-separation of every pair tighter than it. The two per-operator scalars
    // in this system disagree about which operators are alike.
    const pair = report.pairs.find((p) => p.a === "Ana" && p.b === "Flux");
    expect(pair?.effectDistance).toBeCloseTo(0.0141, 4);
    expect(pair?.lambdaGap).toBeCloseTo(0.15, 10);

    const tighter = report.pairs.filter((p) => p.effectDistance < pair!.effectDistance);
    expect(tighter).toHaveLength(4);
    expect(Math.max(...tighter.map((p) => p.lambdaGap))).toBeLessThan(0.05);
  });
});

describe("formatDegeneracyReport", () => {
  it("leads with both counts and lists topN pairs", () => {
    const text = formatDegeneracyReport(degeneracyReport(), 3);
    expect(text).toContain("62 of 190");
    expect(text).toContain("33 of 190");
    expect(text).toContain("Seed ~ Latch");
    expect(text.trimEnd().split("\n").filter((l) => l.startsWith("  "))).toHaveLength(3);
  });
});
