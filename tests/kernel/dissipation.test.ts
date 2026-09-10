import { describe, expect, it } from "vitest";
import formalismData from "../../src/assets/formalism.json" with { type: "json" };
import { OPERATORS } from "../../src/kernel/types.js";
import { commutatorMagnitude, commutatorPairCount } from "../../src/kernel/commutator.js";
import {
  DISSIPATION_MAX_INTERACTION,
  DISSIPATION_PAIRWISE_COEFFICIENT,
  lambdaIntrinsic,
} from "../../src/kernel/formalism.js";
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

/**
 * Where the clamp sits, pinned.
 *
 * `formalism.json`'s formula string and `lambdaPairwise`'s docstring both used
 * to state `λ_j + c·min(max, |η|)` while the code computed
 * `λ_j + min(c·|η|, max)` — a transposition that changes the interaction term
 * on every pair with `|η| > 0.4`, capping it at 0.06 rather than 0.15. The
 * implementation was the sound one: upstream's calculator clamps the scaled
 * term (docs/inspirations/20-controlled-rupture-operators.md), and this port
 * follows it. Both prose statements were corrected, and these tests are what
 * stop them drifting apart again.
 */
describe("the pairwise λ formula the formalism states", () => {
  const stated = (i: (typeof OPERATORS)[number], j: (typeof OPERATORS)[number]) =>
    lambdaIntrinsic(j) +
    Math.min(
      DISSIPATION_PAIRWISE_COEFFICIENT * Math.abs(commutatorMagnitude(i, j)),
      DISSIPATION_MAX_INTERACTION,
    );

  const transposed = (i: (typeof OPERATORS)[number], j: (typeof OPERATORS)[number]) =>
    lambdaIntrinsic(j) +
    DISSIPATION_PAIRWISE_COEFFICIENT *
      Math.min(DISSIPATION_MAX_INTERACTION, Math.abs(commutatorMagnitude(i, j)));

  it("clamps the scaled term, over all 400 pairs", () => {
    for (const i of OPERATORS) {
      for (const j of OPERATORS) {
        expect(lambdaPairwise(i, j)).toBeCloseTo(stated(i, j), 12);
      }
    }
  });

  it("is not the transposed reading, wherever the two differ", () => {
    const differing = OPERATORS.flatMap((i) =>
      OPERATORS.filter((j) => Math.abs(stated(i, j) - transposed(i, j)) > 1e-12).map((j) => [i, j]),
    );
    // The readings agree only where |η| <= 0.4; that they differ on most pairs
    // is why the transposition was worth correcting rather than shrugging at.
    expect(differing.length).toBeGreaterThan(0);
    for (const [i, j] of differing) {
      expect(lambdaPairwise(i!, j!)).not.toBeCloseTo(transposed(i!, j!), 12);
    }
  });

  it("states in formalism.json the formula the kernel implements", () => {
    const formula = (formalismData as unknown as { dissipation_rules: { formula: string } })
      .dissipation_rules.formula;
    expect(formula).toBe("λ(i→j) = λ_j_intrinsic + min(c·|η_{ij}|, max_interaction_magnitude)");
  });

  /**
   * Inert, and faithfully so: `|η| ≤ 1` and `c = 0.15`, so the scaled term
   * never approaches the 0.4 clamp. It is upstream's constant, kept because
   * this is a port — not because anything here depends on it.
   */
  it("never reaches the max-interaction clamp on the shipped skeleton", () => {
    for (const i of OPERATORS) {
      for (const j of OPERATORS) {
        const scaled = DISSIPATION_PAIRWISE_COEFFICIENT * Math.abs(commutatorMagnitude(i, j));
        expect(scaled).toBeLessThan(DISSIPATION_MAX_INTERACTION);
      }
    }
  });
});

/**
 * Characterization tests for the vendored commutator skeleton (see
 * src/assets/NOTICE.md item 5). `commutatorMagnitude` reads the skeleton's
 * extraction-derived `|η_ij|` directly; for 384 of 400 pairs that magnitude
 * already equals what the old sign-only binary mapping produced, so most
 * pairs are unaffected. These pin the 16 where it does not.
 */
describe("commutator skeleton: extraction magnitude", () => {
  it("Bind/Weave and Seed/Crux are non-commuting at full magnitude", () => {
    // formalism.json's neutral_commutations used to (incorrectly) claim both
    // pairs were 0; that claim was removed as it contradicted the skeleton.
    expect(commutatorMagnitude("Bind", "Weave")).toBe(1.0);
    expect(commutatorMagnitude("Weave", "Bind")).toBe(1.0);
    expect(commutatorMagnitude("Seed", "Crux")).toBe(1.0);
    expect(commutatorMagnitude("Crux", "Seed")).toBe(1.0);
  });

  it("keeps the genuinely commuting pairs at magnitude 0 in both directions", () => {
    expect(commutatorMagnitude("Para", "Telo")).toBe(0.0);
    expect(commutatorMagnitude("Pro", "Kata")).toBe(0.0);
    expect(commutatorMagnitude("Kata", "Pro")).toBe(0.0);
  });

  it("trusts extraction evidence over an architecturally-zero sign: Telo->Para", () => {
    // The skeleton's sign for Telo->Para is 0 ("commuting"), but its own
    // extraction magnitude is 0.335 — evidence of an interaction the sign
    // alone didn't predict. Only this direction carries it: Para->Telo is a
    // clean 0. Both are read as authored, not reconciled into agreement.
    expect(commutatorMagnitude("Telo", "Para")).toBeCloseTo(0.335, 10);
  });

  it("yields an interaction term of c*1.0 = 0.15 for a full-magnitude non-commuting pair", () => {
    expect(lambdaPairwise("Ana", "Kata") - 0.35).toBeCloseTo(0.15, 10);
  });

  it("yields a reduced interaction term when extraction magnitude is below 1.0: Meta->Non", () => {
    // Meta->Non: sign +1 (non-commuting) but measured magnitude 0.335, so the
    // term is c*0.335 = 0.05025, not the 0.15 the sign alone would imply.
    expect(lambdaPairwise("Meta", "Non") - 0.9).toBeCloseTo(0.05025, 10);
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
