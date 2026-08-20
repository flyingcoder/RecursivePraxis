import { describe, expect, it } from "vitest";
import { solve } from "../../src/kernel/solver.js";
import { violatesHardConstraint } from "../../src/kernel/constraints.js";

describe("solve", () => {
  it("returns an immediate empty-sequence success when already within threshold", () => {
    const result = solve({ initial: { D: 0.5, C: 0.5 }, target: { D: 0.5, C: 0.5 } });
    expect(result.success).toBe(true);
    expect(result.sequence).toEqual([]);
    expect(result.finalState).toEqual({ D: 0.5, C: 0.5 });
  });

  it("matches the ported Python solver on a simple stabilization case (0.6,0.6)->(0.2,0.2)", () => {
    // Ground truth from inverse_solver.py InverseSolver().solve((0.6,0.6),(0.2,0.2), beam_width=5):
    // sequence=['Kata','Kata'], success=True, cost=0.675
    const result = solve({
      initial: { D: 0.6, C: 0.6 },
      target: { D: 0.2, C: 0.2 },
      beamWidth: 5,
    });
    expect(result.success).toBe(true);
    expect(result.sequence).toEqual(["Kata", "Kata"]);
    expect(result.cost).toBeCloseTo(0.675, 6);
    expect(result.finalState.D).toBeCloseTo(0.2, 10);
    expect(result.finalState.C).toBeCloseTo(0.3, 10);
  });

  it("never proposes a sequence that violates the shared hard constraints", () => {
    const result = solve({
      initial: { D: 0.9, C: 0.85 },
      target: { D: 0.4, C: 0.4 },
      beamWidth: 10,
    });
    for (let i = 0; i < result.sequence.length; i += 1) {
      const prefix = result.sequence.slice(0, i);
      expect(violatesHardConstraint(prefix, result.sequence[i]!)).toBe(false);
    }
  });

  it("terminates within max_path_length (14) steps", () => {
    const result = solve({
      initial: { D: 0.95, C: 0.9 },
      target: { D: 0.05, C: 0.05 },
      beamWidth: 5,
    });
    expect(result.sequence.length).toBeLessThanOrEqual(14);
  });
});
