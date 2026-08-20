import { describe, expect, it } from "vitest";
import {
  applyOperator,
  attractorPenalty,
  classifyAttractor,
  lyapunov,
  operatorEffect,
  simulateTrajectory,
} from "../../src/kernel/phasePortrait.js";

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

  it("returns void when D > 0.8", () => {
    expect(classifyAttractor(0.85, 0.1)).toBe("void");
  });

  it("returns void when C > 0.9", () => {
    expect(classifyAttractor(0.1, 0.95)).toBe("void");
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
    expect(attractorPenalty("void")).toBeCloseTo(1.0, 10);
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
