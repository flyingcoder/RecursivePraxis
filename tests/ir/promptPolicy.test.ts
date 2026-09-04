import { describe, expect, it } from "vitest";
import type { Operator } from "../../src/kernel/types.js";
import { OperatorProperty, PromptPolicy } from "../../src/ir/promptPolicy.js";

/** The worked instance from praxis/protaseis/operator-chain-as-prompt-policy.psuedo. */
const CHAIN: readonly Operator[] = ["Axis", "Ana", "Pro", "Para", "Kata", "Latch"];
const INTENT = "Research about torsion field";

const policy = PromptPolicy.compose(CHAIN);
const brief = policy.render(INTENT);

describe("composing a chain", () => {
  it("keeps one property per chain element", () => {
    expect(policy.properties.map((p) => p.op)).toEqual(CHAIN);
  });

  it("does not collapse repeats the way the execution program does", () => {
    // compileExecutionProgram runs normalizeSequence, which folds Meta,Meta
    // into one run. A policy needs both, or its properties desync from its
    // seams (which analyzeSequence never collapses).
    const repeated = PromptPolicy.compose(["Axis", "Meta", "Meta", "Kata"]);
    expect(repeated.properties).toHaveLength(4);
    expect(repeated.seams).toHaveLength(3);
  });

  it("reports the kernel's own numbers for the chain", () => {
    expect(policy.lambdaEffective).toBeCloseTo(0.658, 10);
    expect(policy.netEffect[0]).toBeCloseTo(-0.21, 10);
    expect(policy.netEffect[1]).toBeCloseTo(-0.09, 10);
    expect(policy.netContractive).toBe(true);
  });

  it("prices every adjacent pair as a seam", () => {
    expect(policy.seams).toHaveLength(CHAIN.length - 1);
    expect(policy.costliestSeams(2)).toEqual([
      { from: "Axis", to: "Ana", lambda: 0.9 },
      { from: "Pro", to: "Para", lambda: 0.8 },
    ]);
  });

  it("takes its terminal character from the last operator", () => {
    expect(policy.terminal.op).toBe("Latch");
    expect(policy.terminal.lifetime.kind).toBe("standing");
  });
});

describe("a chain is rejected rather than repaired", () => {
  it("refuses a sequence the grammar forbids, citing the named constraint", () => {
    expect(() => PromptPolicy.compose(["Axis", "Ana"])).toThrow(/end-on-ana/u);
  });

  it("refuses an empty chain", () => {
    expect(() => PromptPolicy.compose([])).toThrow(/empty chain/u);
  });
});

describe("properties carry their execution-mode fields", () => {
  it("makes the B-Disruptive properties read-only", () => {
    // The capability table's own rule: a step whose job is to attack the
    // current answer must not be able to commit one.
    for (const op of ["Ana", "Para"] as const) {
      expect(OperatorProperty.for(op).mayCommit).toBe(false);
    }
  });

  it("lets the constructive and structural properties commit", () => {
    for (const op of ["Axis", "Pro", "Kata", "Latch"] as const) {
      expect(OperatorProperty.for(op).mayCommit).toBe(true);
    }
  });

  it("tags each property so a clause can be traced back to its operator", () => {
    expect(OperatorProperty.for("Ana").tag).toBe("↑ Analysis/Abstraction #1");
    expect(OperatorProperty.for("Latch").tag).toBe("⊣ Latch/Lock #20");
  });

  it("collapses the shared exit tests of same-class operators", () => {
    // requiredArtifact is per CLASS, and this chain spans three of them
    // (D-Structural, B-Disruptive, A-Constructive), so six properties demand
    // three distinct artifacts, not six.
    expect(policy.requiredArtifacts()).toHaveLength(3);
  });
});

describe("the rendered brief is one composed policy, not a step list", () => {
  it("carries no heading per operator", () => {
    // The negative check the whole design exists to enforce.
    expect(policy.verify(brief).perOperatorHeadings).toEqual([]);
    expect(brief).not.toMatch(/^#{2,}\s.*\b(Axis|Ana|Pro|Para|Kata|Latch)\b/mu);
  });

  it("does not order the reader through the chain", () => {
    expect(brief).toContain("simultaneously");
    expect(brief).toContain("not phases");
  });

  it("names every operator and demands every exit test", () => {
    const verification = policy.verify(brief);
    expect(verification.missingOperators).toEqual([]);
    expect(verification.missingArtifacts).toEqual([]);
  });

  it("states the read-only properties cannot settle a question", () => {
    expect(brief).toContain("read-only by construction");
  });

  it("names the costliest seams so they get bound explicitly", () => {
    expect(brief).toContain("Axis with Ana");
    expect(brief).toContain("Pro with Para");
  });

  it("reports the intent verbatim", () => {
    expect(brief).toContain(INTENT);
  });
});

describe("verification catches a brief that lost the policy reading", () => {
  it("reports operators whose clause was dropped", () => {
    expect(policy.verify("nothing here").missingOperators).toEqual(CHAIN);
  });

  it("reports a heading that names an operator", () => {
    const stepList = `${brief}\n## 1. Axis — do the framing`;
    expect(policy.verify(stepList).perOperatorHeadings).toHaveLength(1);
  });
});

/**
 * The adjective seam.
 *
 * The authored table is intent-blind by construction — Ana is "analytical"
 * whether the task is a literature review or a crash triage — so a caller may
 * substitute one word. What must not happen is a substituted word passing as an
 * authored one: the whole meta-prompt discipline is that every clause traces to
 * a named operator field, so a clause traceable only to the caller has to say
 * so. Composition with no options stays a pure function of the chain, which is
 * what keeps a composed brief replayable.
 */
describe("a caller-supplied adjective", () => {
  const TRIAGE: readonly Operator[] = ["Axis", "Ana", "Ortho", "Kata", "Latch"];
  const override = {
    Ana: {
      adjective: "diagnostic",
      reason: "the intent is a crash triage, where breaking apart isolates a fault",
    },
  };

  it("is the default's opposite number: with no options nothing is the caller's", () => {
    expect(policy.properties.every((p) => p.adjectiveSource === "authored")).toBe(true);
    expect(policy.properties.every((p) => p.adjectiveReason === undefined)).toBe(true);
    expect(policy.verify(brief).callerSuppliedAdjectives).toEqual([]);
  });

  it("composes the same brief twice from the same chain, options aside", () => {
    expect(PromptPolicy.compose(CHAIN).render(INTENT)).toBe(brief);
  });

  it("replaces only the operator it names", () => {
    const composed = PromptPolicy.compose(TRIAGE, { adjectives: override });
    const byOp = new Map(composed.properties.map((p) => [p.op, p]));
    expect(byOp.get("Ana")!.adjective).toBe("diagnostic");
    expect(byOp.get("Ana")!.adjectiveSource).toBe("caller");
    expect(byOp.get("Kata")!.adjective).toBe("synthesized");
    expect(byOp.get("Kata")!.adjectiveSource).toBe("authored");
  });

  it("says in the brief that the word is the caller's, and what it displaced", () => {
    const composed = PromptPolicy.compose(TRIAGE, { adjectives: override });
    const rendered = composed.render("Find why the parser drops the last token");
    expect(rendered).toContain("Work **diagnostic**");
    expect(rendered).toContain('The adjective is the caller\'s, not this operator\'s authored "analytical"');
    expect(rendered).toContain("where breaking apart isolates a fault");
  });

  it("is reported by verification, so a reviewer need not read for it", () => {
    const composed = PromptPolicy.compose(TRIAGE, { adjectives: override });
    const rendered = composed.render("Find why the parser drops the last token");
    expect(composed.verify(rendered).callerSuppliedAdjectives).toEqual(["Ana"]);
  });

  it("cannot make two operators indistinguishable in the same brief", () => {
    // The invariant the authored table is tested for, enforced over the
    // composed set: a clause has to be traceable to one property.
    expect(() =>
      PromptPolicy.compose(TRIAGE, {
        adjectives: { Ana: { adjective: "Truth-Aligned", reason: "case is not a loophole" } },
      }),
    ).toThrow(/would both be "truth-aligned"/u);
  });

  it("still admits a repeated operator, which is not a collision", () => {
    const repeated = PromptPolicy.compose(["Axis", "Meta", "Meta", "Kata"], {
      adjectives: { Meta: { adjective: "self-auditing", reason: "the intent is a post-mortem" } },
    });
    expect(repeated.properties).toHaveLength(4);
    expect(repeated.properties.filter((p) => p.adjective === "self-auditing")).toHaveLength(2);
  });

  it("rejects an override for an operator the chain does not contain", () => {
    // Ignoring it would let the caller believe a word took effect.
    expect(() =>
      PromptPolicy.compose(TRIAGE, {
        adjectives: { Meta: { adjective: "reflective", reason: "not in this chain" } },
      }),
    ).toThrow(/which the chain does not contain/u);
  });
});
