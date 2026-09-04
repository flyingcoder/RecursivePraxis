import { describe, expect, it } from "vitest";
import { OPERATORS } from "../../src/kernel/types.js";
import { operatorMeaning } from "../../src/kernel/formalism.js";
import { ALL_OPERATORS, lookupOperator, type AuthoredOperator } from "../../src/vocab/operators.js";
import { PromptVocabulary } from "../../src/vocab/prompt-policy.js";

function authored(name: string): AuthoredOperator {
  const found = lookupOperator(name);
  if (!found) throw new Error(`no such operator: ${name}`);
  return found;
}

describe("the adjective table covers the alphabet", () => {
  it("gives every one of the 20 operators a non-empty adjective", () => {
    for (const op of OPERATORS) {
      expect(PromptVocabulary.adjectiveFor(op)).toMatch(/\S/u);
    }
    expect(PromptVocabulary.allAdjectives().size).toBe(OPERATORS.length);
  });

  it("gives distinct operators distinct adjectives", () => {
    // Two operators sharing an adjective would make the composed brief
    // ambiguous about which property a clause came from.
    const adjectives = OPERATORS.map((op) => PromptVocabulary.adjectiveFor(op));
    expect(new Set(adjectives).size).toBe(OPERATORS.length);
  });
});

/**
 * The table is authored prose derived from each operator's `meaning`, and the
 * derivation used to live in a comment nothing checked. `from` carries the text
 * an adjective was read off so a formalism edit that moves a meaning fails here
 * instead of leaving a stale word in every composed brief. It pins provenance,
 * not correctness: whether "analytical" is the right word for "Break apart,
 * raise conceptual level" is still a judgment for a reviewer.
 */
describe("each adjective still traces to the meaning it was read from", () => {
  it("matches formalism.json verbatim for every operator", () => {
    for (const op of OPERATORS) {
      expect(PromptVocabulary.adjectiveSourceText(op)).toBe(operatorMeaning(op));
    }
  });
});

/**
 * The seam off the authored default. It exists because the table is
 * intent-blind — "analytical" reads differently over a literature review than
 * over a crash triage — and it is bounded so a supplied word can never pass as
 * an authored one.
 */
describe("resolving an adjective", () => {
  it("uses the authored table when nothing is supplied", () => {
    expect(PromptVocabulary.resolveAdjective("Ana")).toEqual({
      adjective: "analytical",
      source: "authored",
    });
  });

  it("takes a caller's word, labelled as the caller's and carrying its reason", () => {
    expect(
      PromptVocabulary.resolveAdjective("Ana", {
        adjective: "  diagnostic  ",
        reason: "  the intent is a crash triage  ",
      }),
    ).toEqual({
      adjective: "diagnostic",
      source: "caller",
      reason: "the intent is a crash triage",
    });
  });

  it("requires a reason, because an unexplained override is just a preference", () => {
    expect(() =>
      PromptVocabulary.resolveAdjective("Ana", { adjective: "diagnostic", reason: "   " }),
    ).toThrow(/must say why the authored "analytical" misfits/u);
  });

  it("rejects an empty adjective", () => {
    expect(() =>
      PromptVocabulary.resolveAdjective("Ana", { adjective: "  ", reason: "because" }),
    ).toThrow(/cannot be empty/u);
  });

  it("rejects a sentence: a property is named by a phrase, not argued in place", () => {
    expect(() =>
      PromptVocabulary.resolveAdjective("Ana", {
        adjective: "the kind of analysis that takes the parser apart carefully",
        reason: "because",
      }),
    ).toThrow(/one short phrase/u);
  });

  it("rejects a multi-line adjective", () => {
    expect(() =>
      PromptVocabulary.resolveAdjective("Ana", { adjective: "diag\nnostic", reason: "because" }),
    ).toThrow(/single phrase/u);
  });
});

describe("lifetime is read off idempotence", () => {
  it("makes the fully idempotent operators standing invariants", () => {
    // formalism.json algebra_relations.idempotence.full
    for (const name of ["Kata", "Ortho", "Telo", "Latch"]) {
      expect(PromptVocabulary.lifetimeFor(authored(name)).kind).toBe("standing");
    }
  });

  it("makes the never-idempotent operators one-shot licenses", () => {
    // formalism.json algebra_relations.idempotence.never
    for (const name of ["Ana", "Para", "Non", "Retro"]) {
      expect(PromptVocabulary.lifetimeFor(authored(name)).kind).toBe("one-shot");
    }
  });

  it("reads each semi-idempotent operator's coefficient out of its stated rule", () => {
    // The three "semi" entries, with the coefficients formalism.json states.
    expect(PromptVocabulary.lifetimeFor(authored("Meta"))).toMatchObject({
      kind: "decaying",
      coefficient: 0.6,
    });
    expect(PromptVocabulary.lifetimeFor(authored("Pro"))).toMatchObject({
      kind: "decaying",
      coefficient: 0.5,
    });
    expect(PromptVocabulary.lifetimeFor(authored("Echo"))).toMatchObject({
      kind: "decaying",
      coefficient: 0.8,
    });
  });

  it("covers every operator without falling through", () => {
    for (const entry of ALL_OPERATORS) {
      expect(PromptVocabulary.lifetimeFor(entry).phrase).toMatch(/\S/u);
    }
  });
});

describe("a decaying property with an unknown decay fails closed", () => {
  it("throws when a semi-idempotent operator states no rule", () => {
    const entry = { ...authored("Pro"), idempotenceRule: undefined } as AuthoredOperator;
    expect(() => PromptVocabulary.lifetimeFor(entry)).toThrow(/states no idempotence_rule/u);
  });

  it("throws rather than defaulting when the rule states no coefficient", () => {
    // Papering over this with a default would emit a confident phrase about a
    // decay rate nothing supplied.
    const entry = { ...authored("Pro"), idempotenceRule: "Pro² = Pro" } as AuthoredOperator;
    expect(() => PromptVocabulary.lifetimeFor(entry)).toThrow(/does not state a coefficient/u);
  });
});
