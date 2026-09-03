import { describe, expect, it } from "vitest";
import {
  DERIVE_CONTRADICTION_WEIGHT,
  DERIVE_C_INTERCEPT,
  DERIVE_UNRESOLVED_CLAIM_WEIGHT,
  STABLE_TARGET_DISSIPATION,
  deriveInitialDissipation,
  type IntentSignals,
} from "../../src/kernel/derive.js";
import {
  VOID_C_THRESHOLD,
  VOID_D_THRESHOLD,
  classifyAttractor,
} from "../../src/kernel/phasePortrait.js";
import type { AttractorLabel } from "../../src/kernel/types.js";

/**
 * The grid the calibration was chosen against. These bounds are the sweep's
 * definition, not a guess at realistic input: `unresolvedClaims` is
 * deliberately swept past any plausible reading so the tail is covered.
 */
const UNCERTAINTY_STEPS = 21; // 0..1 inclusive, step 0.05
const MAX_FAILED_CHECKS = 8;
const MAX_UNRESOLVED_CLAIMS = 10;
const TOTAL_COMBINATIONS = UNCERTAINTY_STEPS * (MAX_FAILED_CHECKS + 1) * (MAX_UNRESOLVED_CLAIMS + 1) * 2;

interface Combination {
  readonly signals: IntentSignals;
  readonly label: AttractorLabel;
}

function filled(count: number): readonly string[] {
  return Array.from({ length: count }, (_, index) => `item-${index}`);
}

/** Every combination in the grid, classified with the real kernel function. */
function sweep(): readonly Combination[] {
  const out: Combination[] = [];
  for (let step = 0; step < UNCERTAINTY_STEPS; step += 1) {
    const uncertainty = step * 0.05;
    for (let failed = 0; failed <= MAX_FAILED_CHECKS; failed += 1) {
      for (let unresolved = 0; unresolved <= MAX_UNRESOLVED_CLAIMS; unresolved += 1) {
        for (const contradictionDetected of [false, true]) {
          const signals: IntentSignals = {
            uncertainty,
            failedChecks: filled(failed),
            unresolvedClaims: filled(unresolved),
            contradictionDetected,
          };
          const { D, C } = deriveInitialDissipation(signals);
          out.push({ signals, label: classifyAttractor(D, C) });
        }
      }
    }
  }
  return out;
}

describe("deriveInitialDissipation", () => {
  it("clamps both axes into [0, 1] at the extremes", () => {
    const saturated = deriveInitialDissipation({
      uncertainty: 1,
      failedChecks: filled(100),
      unresolvedClaims: filled(100),
      contradictionDetected: true,
    });
    expect(saturated).toEqual({ D: 1, C: 1 });

    const empty = deriveInitialDissipation({
      uncertainty: 0,
      failedChecks: [],
      unresolvedClaims: [],
      contradictionDetected: false,
    });
    expect(empty.D).toBeGreaterThanOrEqual(0);
    expect(empty.C).toBeGreaterThanOrEqual(0);
  });

  it("moves each axis only on the signals that belong to it", () => {
    const base: IntentSignals = {
      uncertainty: 0.5,
      failedChecks: [],
      unresolvedClaims: [],
      contradictionDetected: false,
    };
    const withFailure = deriveInitialDissipation({ ...base, failedChecks: filled(3) });
    const withClaims = deriveInitialDissipation({ ...base, unresolvedClaims: filled(3) });
    const baseline = deriveInitialDissipation(base);

    // Failed checks are a D-axis signal only; unresolved claims a C-axis one.
    expect(withFailure.D).toBeGreaterThan(baseline.D);
    expect(withFailure.C).toBe(baseline.C);
    expect(withClaims.C).toBeGreaterThan(baseline.C);
    expect(withClaims.D).toBe(baseline.D);
  });
});

/**
 * The calibration guard. These three assertions are what keep a future weight
 * edit from silently re-breaking the distribution the weights were chosen for
 * — the previous calibration sent 60.3% of this same grid to ∅.
 */
describe("the calibration sweep", () => {
  const combinations = sweep();

  it("covers the whole grid", () => {
    expect(combinations).toHaveLength(TOTAL_COMBINATIONS);
    expect(TOTAL_COMBINATIONS).toBe(4158);
  });

  it("holds the authored attractor distribution", () => {
    const counts = { "J=0": 0, "S*": 0, "∅": 0 } satisfies Record<AttractorLabel, number>;
    for (const { label } of combinations) counts[label] += 1;

    expect(counts).toEqual({ "J=0": 5, "S*": 3273, "∅": 880 });
  });

  it("never lets the C axis alone declare collapse", () => {
    // Property 1 of the calibration: the C axis's maximum sits below
    // VOID_C_THRESHOLD with margin, so ∅ is a D-axis verdict. Unresolved
    // claims agitate; only demonstrated failure collapses.
    const maxReachableC =
      DERIVE_C_INTERCEPT +
      MAX_UNRESOLVED_CLAIMS * DERIVE_UNRESOLVED_CLAIM_WEIGHT +
      DERIVE_CONTRADICTION_WEIGHT;

    expect(maxReachableC).toBeCloseTo(0.8, 10);
    expect(maxReachableC).toBeLessThan(VOID_C_THRESHOLD);
    // Margin, not just inequality: a value on the threshold classifies by
    // float comparison, which is exactly what this is keeping clear of.
    expect(VOID_C_THRESHOLD - maxReachableC).toBeGreaterThanOrEqual(0.02);

    for (const { signals, label } of combinations) {
      const { D, C } = deriveInitialDissipation(signals);
      expect(C).toBeLessThan(VOID_C_THRESHOLD);
      if (label === "∅") {
        // classifyAttractor reaches ∅ via `D > VOID_D_THRESHOLD ||
        // C > VOID_C_THRESHOLD`. The C arm is unreachable above, so every
        // collapse must have come through the D arm.
        expect(D).toBeGreaterThan(VOID_D_THRESHOLD);
      }
    }
  });

  it("requires demonstrated failure to reach collapse", () => {
    // Property 2: every ∅ combination carries at least four failed checks.
    const collapsed = combinations.filter(({ label }) => label === "∅");
    expect(collapsed.length).toBeGreaterThan(0);

    const fewest = Math.min(...collapsed.map(({ signals }) => signals.failedChecks.length));
    expect(fewest).toBe(4);
  });

  it("records the known residual: J=0 is effectively unreachable as a derived initial", () => {
    // Not an endorsement — a pin. J=0 is rare because the intercepts leave
    // only 0.04 of headroom under STABILITY_THRESHOLD, and that is a property
    // of the intercepts rather than the weights. If someone lowers them, this
    // fails and they are made to re-run the sweep rather than drift into it.
    const stable = combinations.filter(({ label }) => label === "J=0");
    expect(stable).toHaveLength(5);
    for (const { signals } of stable) {
      expect(signals.failedChecks).toHaveLength(0);
      expect(signals.contradictionDetected).toBe(false);
    }
  });
});

describe("STABLE_TARGET_DISSIPATION", () => {
  it("is the stable attractor every planning path aims at", () => {
    expect(STABLE_TARGET_DISSIPATION).toEqual({ D: 0.1, C: 0.1 });
    expect(classifyAttractor(STABLE_TARGET_DISSIPATION.D, STABLE_TARGET_DISSIPATION.C)).toBe("J=0");
  });
});
