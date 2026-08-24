import { describe, expect, it } from "vitest";
import {
  DEFAULT_OPERATOR_EFFECTS,
  applyOperator,
  attractorPenalty,
  classifyAttractor,
  lyapunov,
  operatorEffect,
  simulateTrajectory,
  suggestTransitionOperators,
  type OperatorEffects,
} from "../../src/kernel/phasePortrait.js";
import { OPERATORS, type AttractorLabel } from "../../src/kernel/types.js";
import { solve } from "../../src/kernel/solver.js";

describe("lyapunov", () => {
  it("computes V = D + 0.4*C", () => {
    expect(lyapunov(0.5, 0.5)).toBeCloseTo(0.7, 10);
    expect(lyapunov(0.1, 0.1)).toBeCloseTo(0.14, 10);
  });
});

describe("classifyAttractor", () => {
  it("returns J=0 when V < 0.3", () => {
    expect(classifyAttractor(0.1, 0.1)).toBe("J=0");
  });

  it("returns ∅ when D > 0.8", () => {
    expect(classifyAttractor(0.85, 0.1)).toBe("∅");
  });

  it("returns ∅ when C > 0.9", () => {
    expect(classifyAttractor(0.1, 0.95)).toBe("∅");
  });

  it("returns S* for the productive-contradiction middle region", () => {
    expect(classifyAttractor(0.5, 0.5)).toBe("S*");
  });

  it("V<0.3 takes priority and D>0.8/C>0.9 are mutually exclusive with it by construction", () => {
    // D=0.85 alone already forces V=D+0.4C >= 0.85 > 0.3, so J=0 can never
    // fire simultaneously with the void condition — verifying that invariant
    // holds for the exact boundary the kernel relies on.
    expect(lyapunov(0.85, 0)).toBeGreaterThan(0.3);
  });
});

describe("applyOperator / operatorEffect", () => {
  it("clamps D and C to [0, 1]", () => {
    const next = applyOperator({ D: 0.95, C: 0.95 }, "Non"); // Non: (+0.25, +0.20)
    expect(next.D).toBeLessThanOrEqual(1);
    expect(next.C).toBeLessThanOrEqual(1);
  });

  it("applies the ported (deltaD, deltaC) for Kata exactly", () => {
    const [dD, dC] = operatorEffect("Kata");
    expect(dD).toBeCloseTo(-0.2, 10);
    expect(dC).toBeCloseTo(-0.15, 10);
    const next = applyOperator({ D: 0.5, C: 0.5 }, "Kata");
    expect(next.D).toBeCloseTo(0.3, 10);
    expect(next.C).toBeCloseTo(0.35, 10);
  });
});

describe("attractorPenalty", () => {
  it("matches formalism.json inverse_solver.attractor_penalties", () => {
    expect(attractorPenalty("J=0")).toBeCloseTo(0.1, 10);
    expect(attractorPenalty("S*")).toBeCloseTo(0.3, 10);
    expect(attractorPenalty("∅")).toBeCloseTo(1.0, 10);
  });
});

describe("simulateTrajectory", () => {
  it("produces sequence.length + 1 steps, starting with the initial state", () => {
    const traj = simulateTrajectory({ D: 0.5, C: 0.5 }, ["Kata", "Telo"]);
    expect(traj.length).toBe(3);
    expect(traj[0]!.operator).toBeNull();
    expect(traj[0]!.D).toBeCloseTo(0.5, 10);
    expect(traj[1]!.operator).toBe("Kata");
  });
});

/**
 * The effects seam — docs/ALGEBRA_DYNAMICS_SEAM.md §3: the effects
 * table is injectable. The defect being fixed was not a missing abstraction but
 * a seam nothing could reach — so these tests assert both halves: the default
 * path is byte-for-byte what it was, and an injected table actually changes the
 * trajectory and the solver's answer.
 */
describe("operator effects injection", () => {
  const flat: OperatorEffects = Object.freeze(
    Object.fromEntries(OPERATORS.map((op) => [op, [0, 0] as const])),
  ) as OperatorEffects;

  it("DEFAULT_OPERATOR_EFFECTS covers every operator exactly once", () => {
    expect(Object.keys(DEFAULT_OPERATOR_EFFECTS).sort()).toEqual([...OPERATORS].sort());
  });

  it("operatorEffect defaults to the built-in table and honours an injected one", () => {
    expect(operatorEffect("Kata")).toEqual([-0.2, -0.15]);
    expect(operatorEffect("Kata", DEFAULT_OPERATOR_EFFECTS)).toEqual([-0.2, -0.15]);
    expect(operatorEffect("Kata", flat)).toEqual([0, 0]);
  });

  it("applyOperator defaults to the built-in table and honours an injected one", () => {
    const state = { D: 0.5, C: 0.5 };
    expect(applyOperator(state, "Kata")).toEqual(applyOperator(state, "Kata", DEFAULT_OPERATOR_EFFECTS));
    expect(applyOperator(state, "Kata").D).toBeCloseTo(0.3, 10);
    expect(applyOperator(state, "Kata", flat)).toEqual(state);
  });

  it("simulateTrajectory with an injected table changes the path but not its shape", () => {
    const sequence = ["Kata", "Telo", "Non"] as const;
    const initial = { D: 0.6, C: 0.6 };
    const withDefault = simulateTrajectory(initial, sequence);
    const withFlat = simulateTrajectory(initial, sequence, flat);

    expect(withFlat).toHaveLength(withDefault.length);
    expect(withFlat.map((s) => s.operator)).toEqual(withDefault.map((s) => s.operator));
    // A zero table makes every step a fixed point at the initial state.
    expect(withFlat.every((s) => s.D === initial.D && s.C === initial.C)).toBe(true);
    expect(withDefault.some((s) => s.D !== initial.D)).toBe(true);
  });

  it("solve threads the table end to end: a zero table can never reach a distant target", () => {
    const options = { initial: { D: 0.9, C: 0.9 }, target: { D: 0.1, C: 0.1 }, beamWidth: 5 } as const;
    const normal = solve(options);
    const stalled = solve({ ...options, effects: flat });

    expect(normal.success).toBe(true);
    // Every operator is a no-op, so no sequence can close the distance.
    expect(stalled.success).toBe(false);
    expect(stalled.finalState).toEqual(options.initial);
  });

  it("passing DEFAULT_OPERATOR_EFFECTS explicitly is identical to passing nothing", () => {
    const options = { initial: { D: 0.85, C: 0.75 }, target: { D: 0.3, C: 0.35 }, beamWidth: 10 } as const;
    expect(solve({ ...options, effects: DEFAULT_OPERATOR_EFFECTS })).toEqual(solve(options));
  });
});

/**
 * The suggestion table — docs/ALGEBRA_DYNAMICS_SEAM.md §3: the table ported
 * from phase_portrait.py `suggest_transition_operators`, chosen over the inert
 * five-entry table in formalism.json (see src/assets/NOTICE.md item 7).
 */
describe("suggestTransitionOperators", () => {
  const expected: ReadonlyArray<readonly [AttractorLabel, AttractorLabel, readonly string[]]> = [
    ["S*", "J=0", ["Kata", "Telo", "Seed", "Latch"]],
    ["∅", "J=0", ["Telo", "Kata", "Axis", "Bind"]],
    ["J=0", "S*", ["Para", "Ana", "Crux", "Echo"]],
    ["∅", "S*", ["Pro", "Ortho", "Weave", "Seed"]],
    ["S*", "∅", ["Non", "Meta", "Vale", "Fold"]],
    ["J=0", "∅", ["Non", "Vale", "Flux"]],
  ];

  for (const [from, to, ops] of expected) {
    it(`maps ${from} -> ${to} to the ported operator list`, () => {
      expect(suggestTransitionOperators(from, to)).toEqual(ops);
    });
  }

  it("covers six pairs — one more than the superseded formalism.json table", () => {
    expect(expected).toHaveLength(6);
  });

  const labels: readonly AttractorLabel[] = ["J=0", "S*", "∅"];

  it("returns an empty list for every same-attractor pair", () => {
    for (const label of labels) {
      expect(suggestTransitionOperators(label, label)).toEqual([]);
    }
  });

  it("maps exactly the six cross-attractor pairs and nothing else", () => {
    const mapped = labels.flatMap((from) =>
      labels
        .filter((to) => suggestTransitionOperators(from, to).length > 0)
        .map((to) => `${from}->${to}`),
    );
    expect(mapped.sort()).toEqual(
      ["J=0->S*", "J=0->∅", "S*->J=0", "S*->∅", "∅->J=0", "∅->S*"].sort(),
    );
  });

  it("only ever suggests real operators", () => {
    for (const from of labels) {
      for (const to of labels) {
        for (const op of suggestTransitionOperators(from, to)) {
          expect(OPERATORS).toContain(op);
        }
      }
    }
  });
});
