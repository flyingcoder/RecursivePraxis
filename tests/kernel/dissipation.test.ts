import { describe, expect, it } from "vitest";
import { OPERATORS } from "../../src/kernel/types.js";
import { commutatorPairCount } from "../../src/kernel/commutator.js";
import {
  lambdaEffective,
  lambdaPairwise,
  totalDissipationCost,
  analyzeSequence,
} from "../../src/kernel/dissipation.js";

describe("formalism/commutator ground truth", () => {
  it("has exactly 20 operators", () => {
    expect(OPERATORS.length).toBe(20);
  });

  it("has a full 20x20 = 400 commutator pair table", () => {
    expect(commutatorPairCount()).toBe(400);
  });
});

describe("lambdaPairwise", () => {
  it("matches lambda_j_intrinsic + c*min(0.4, |commutator|) for a known non-zero commutator", () => {
    // Ana -> Kata: formalism Kata.lambda_intrinsic = 0.35, commutator sign = -1 (magnitude 1.0)
    // interaction = min(0.15 * 1.0, 0.4) = 0.15 -> lambda = 0.35 + 0.15 = 0.5
    expect(lambdaPairwise("Ana", "Kata")).toBeCloseTo(0.5, 10);
  });

  it("matches lambda_j_intrinsic alone when commutator sign is 0", () => {
    // Ana -> Ana: sign 0 -> magnitude 0.0 -> interaction 0
    expect(lambdaPairwise("Ana", "Ana")).toBeCloseTo(0.75, 10);
  });
});

describe("lambdaEffective / totalDissipationCost", () => {
  it("returns 0 for sequences shorter than 2", () => {
    expect(lambdaEffective([])).toBe(0);
    expect(lambdaEffective(["Ana"])).toBe(0);
    expect(totalDissipationCost(["Ana"])).toBe(0);
  });

  it("is the mean of pairwise lambdas for a longer sequence", () => {
    const seq: readonly ("Ana" | "Meta" | "Non")[] = ["Ana", "Meta", "Non"];
    const p1 = lambdaPairwise("Ana", "Meta");
    const p2 = lambdaPairwise("Meta", "Non");
    expect(lambdaEffective(seq)).toBeCloseTo((p1 + p2) / 2, 10);
    expect(totalDissipationCost(seq)).toBeCloseTo(p1 + p2, 10);
  });
});

describe("analyzeSequence", () => {
  it("produces a decay array of length sequence.length + 1 starting at D=1.0", () => {
    const analysis = analyzeSequence(["Kata", "Telo", "Ortho"]);
    expect(analysis.predictedDecay.length).toBe(4);
    expect(analysis.predictedDecay[0]).toBeCloseTo(1.0, 10);
  });

  it("reports Infinity half-life for a zero-lambda (degenerate) sequence", () => {
    const analysis = analyzeSequence(["Ana"]);
    expect(analysis.lambdaEffective).toBe(0);
    expect(analysis.halfLife).toBe(Infinity);
  });
});
