import { describe, expect, it } from "vitest";
import { OPERATORS } from "../../src/kernel/types.js";
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
