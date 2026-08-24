import { describe, expect, it } from "vitest";
import { solve, SOLVER_BETA, SOLVER_GAMMA } from "../../src/kernel/solver.js";
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

/**
 * CHARACTERIZATION — updated when the frontier ranking was corrected; see
 * docs/ALGEBRA_DYNAMICS_SEAM.md §3.
 *
 * The solver now ranks its frontier by the A* key `g + h`, where `g` is the
 * already-paid cost (dissipation + attractor penalty) and `h` is the remaining
 * distance. It previously ranked by `J + h`, which counted terminal distance
 * twice and discarded sequences that J itself scored better.
 *
 * `J` — the reported `cost` — is NOT redefined by that change. So each row
 * below carries the J it scored under the *old* ranking, and the suite asserts
 * `J_new <= J_old` directly. Three of the five templates changed sequence, and
 * every one of them moved to a strictly lower J under the unchanged objective.
 * A future change that raises any `cost` here is a regression, not a re-pin.
 */
describe("solve — characterization of the g + h ranking (post-Phase-1)", () => {
  const cases = [
    {
      name: "stuck",
      initial: { D: 0.85, C: 0.75 },
      target: { D: 0.3, C: 0.35 },
      sequence: ["Axis", "Telo", "Telo"],
      cost: 0.7654400375,
      previousCost: 0.784,
      finalState: { D: 0.33, C: 0.43 },
    },
    {
      name: "overwhelmed",
      initial: { D: 0.8, C: 0.8 },
      target: { D: 0.2, C: 0.15 },
      sequence: ["Axis", "Telo", "Telo", "Telo", "Telo", "Telo", "Telo", "Flux"],
      cost: 1.6521110255,
      previousCost: 1.7001024968,
      finalState: { D: 0.14, C: 0.19 },
    },
    {
      name: "rigid",
      initial: { D: 0.15, C: 0.1 },
      target: { D: 0.5, C: 0.5 },
      sequence: ["Non", "Crux"],
      cost: 0.8430175425,
      previousCost: 0.8430175425,
      finalState: { D: 0.47, C: 0.39 },
    },
    {
      name: "collapsed",
      initial: { D: 0.95, C: 0.9 },
      target: { D: 0.4, C: 0.45 },
      sequence: ["Kata", "Weave", "Latch"],
      cost: 0.8178516481,
      previousCost: 0.8283606798,
      finalState: { D: 0.42, C: 0.5 },
    },
    {
      name: "procrastinating",
      initial: { D: 0.6, C: 0.5 },
      target: { D: 0.25, C: 0.2 },
      sequence: ["Kata", "Kata"],
      cost: 0.405,
      previousCost: 0.405,
      finalState: { D: 0.2, C: 0.2 },
    },
  ] as const;

  for (const c of cases) {
    it(`diagnose template "${c.name}" at beam width 10`, () => {
      const result = solve({ initial: c.initial, target: c.target, beamWidth: 10 });
      expect(result.sequence).toEqual([...c.sequence]);
      expect(result.cost).toBeCloseTo(c.cost, 9);
      expect(result.finalState.D).toBeCloseTo(c.finalState.D, 9);
      expect(result.finalState.C).toBeCloseTo(c.finalState.C, 9);
      expect(result.success).toBe(true);
    });

    it(`diagnose template "${c.name}" scores no worse than the old ranking did`, () => {
      const result = solve({ initial: c.initial, target: c.target, beamWidth: 10 });
      expect(result.cost).toBeLessThanOrEqual(c.previousCost + 1e-9);
    });
  }

  /**
   * Backlog §4: target (0.15, 0.10) from three initial states. These are
   * unchanged by Phase 1 — the corrected ranking reaches the same sequences.
   */
  const scenarios = [
    { name: "nearly done", initial: { D: 0.3, C: 0.25 }, sequence: ["Weave"], cost: 0.1323606798, finalState: { D: 0.14, C: 0.12 } },
    { name: "typical polish", initial: { D: 0.45, C: 0.4 }, sequence: ["Weave", "Latch"], cost: 0.3713095189, finalState: { D: 0.12, C: 0.15 } },
    { name: "rough draft", initial: { D: 0.6, C: 0.55 }, sequence: ["Weave", "Latch", "Latch"], cost: 0.6103398113, finalState: { D: 0.1, C: 0.18 } },
  ] as const;

  for (const s of scenarios) {
    for (const beamWidth of [5, 12] as const) {
      it(`§4 scenario "${s.name}" at beam width ${beamWidth}`, () => {
        const result = solve({ initial: s.initial, target: { D: 0.15, C: 0.1 }, beamWidth });
        expect(result.sequence).toEqual([...s.sequence]);
        expect(result.cost).toBeCloseTo(s.cost, 9);
        expect(result.finalState.D).toBeCloseTo(s.finalState.D, 9);
        expect(result.finalState.C).toBeCloseTo(s.finalState.C, 9);
        expect(result.success).toBe(true);
      });
    }
  }

  /**
   * Beam width is a live parameter again. Under the old ranking the doubled
   * distance term dominated `g`, flattening the frontier so that widening the
   * beam changed nothing; widths 5 and 12 agreed on every case measured. They
   * now disagree here, and the wider beam finds the better J — which is what a
   * beam width is supposed to buy.
   */
  it("beam width changes the answer on the stuck template, and wider scores better", () => {
    const narrow = solve({ initial: { D: 0.85, C: 0.75 }, target: { D: 0.3, C: 0.35 }, beamWidth: 5 });
    const wide = solve({ initial: { D: 0.85, C: 0.75 }, target: { D: 0.3, C: 0.35 }, beamWidth: 12 });
    expect(narrow.sequence).toEqual(["Telo", "Telo", "Telo"]);
    expect(wide.sequence).toEqual(["Axis", "Telo", "Telo"]);
    expect(wide.cost).toBeLessThan(narrow.cost);
  });

  /**
   * `costBreakdown` is now self-consistent for the start node. The old code
   * carried a `costSoFar` of 0 for the unexpanded start node and reported it as
   * `total`, while the sibling fields described the real state — so a
   * within-threshold solve returned attractorPenalty 0.3 alongside total 0.
   * `total` is now derived from the same parts it is presented with.
   */
  it("reports a start-node cost consistent with its own breakdown", () => {
    const result = solve({ initial: { D: 0.5, C: 0.5 }, target: { D: 0.5, C: 0.5 } });
    const { terminalDistance, dissipationCost, attractorPenalty, total } = result.costBreakdown;
    expect(total).toBeCloseTo(
      terminalDistance + SOLVER_BETA * dissipationCost + SOLVER_GAMMA * attractorPenalty,
      12,
    );
    expect(result.cost).toBe(total);
    expect(total).toBeCloseTo(0.33, 12);
  });
});
