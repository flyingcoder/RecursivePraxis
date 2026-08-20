import { describe, expect, it } from "vitest";
import formalismData from "../../src/assets/formalism.json" with { type: "json" };
import { operatorSymbol } from "../../src/kernel/formalism.js";
import { OPERATORS } from "../../src/kernel/types.js";

const operators = (formalismData as { operators: Record<string, { symbol: string }> })
  .operators;

describe("operatorSymbol", () => {
  it("returns a non-empty glyph for all twenty operators", () => {
    for (const op of OPERATORS) {
      expect(operatorSymbol(op)).toBeTruthy();
    }
  });

  it("matches formalism.json verbatim for every operator", () => {
    for (const op of OPERATORS) {
      expect(operatorSymbol(op)).toBe(operators[op]!.symbol);
    }
  });

  it("carries the SoT glyphs for a spot-check across classes", () => {
    expect(operatorSymbol("Ana")).toBe("↑"); // B-Disruptive
    expect(operatorSymbol("Kata")).toBe("↓"); // A-Constructive
    expect(operatorSymbol("Meta")).toBe("⟲"); // C-Reflexive
    expect(operatorSymbol("Latch")).toBe("⊣"); // A-Constructive
  });

  /**
   * Documented collision inherited from the upstream formalism: Vale's glyph
   * is the same character the phase portrait uses for the collapse attractor.
   * Pinned so the ambiguity stays visible rather than being "fixed" silently.
   * See docs/VOCABULARY.md.
   */
  it("pins the Vale / collapse-attractor glyph collision", () => {
    expect(operatorSymbol("Vale")).toBe("∅");
  });
});
