import { describe, expect, it } from "vitest";
import { CAVEAT, ChainReading } from "../../src/ir/chainReading.js";

describe("reading a chain against the algebra", () => {
  it("reports the relation the formalism states for an adjacent pair", () => {
    const reading = ChainReading.read(["Meta", "Ortho", "Kata"]);
    const pair = reading.pairs.find((p) => p.from === "Meta" && p.to === "Ortho");
    expect(pair!.step).toBe(0);
    expect(pair!.relations[0]!.statement).toBe("Meta ∘ Ortho = Retro");
    expect(pair!.relations[0]!.reading).toContain("composes this pair to Retro");
  });

  it("relates only adjacent pairs — a chain is read as written, not searched", () => {
    // Ortho ∘ Ana = Kata is a relation, but these two are not adjacent here.
    const reading = ChainReading.read(["Ortho", "Kata", "Ana", "Latch"]);
    expect(reading.pairs.some((p) => p.from === "Ortho" && p.to === "Ana")).toBe(false);
  });

  /**
   * `Non ∘ Kata = Para` is authored in both absorption_laws and
   * triple_relations. Reading it out once per list would say the same sentence
   * twice under two headings; the repetition is a property of the source, so it
   * is reported on the one note instead.
   */
  it("says a statement the formalism repeats once, naming both lists", () => {
    const reading = ChainReading.read(["Non", "Kata"]);
    const notes = reading.pairs[0]!.relations.filter((r) => r.statement === "Non ∘ Kata = Para");
    expect(notes).toHaveLength(1);
    expect(notes[0]!.family).toBe("absorption");
    expect(notes[0]!.alsoStatedIn).toEqual(["triple"]);
    expect(notes[0]!.reading).toContain("repeats this statement under triple");
  });

  it("says nothing when the formalism relates nothing in the chain", () => {
    const reading = ChainReading.read(["Braid", "Crux"]);
    expect(reading.hasRelations).toBe(false);
    expect(reading.pairs).toEqual([]);
  });

  it("carries the not-enforced caveat in both renderings", () => {
    const reading = ChainReading.read(["Meta", "Ortho"]);
    expect(reading.renderLines().join("\n")).toContain(CAVEAT);
    expect(reading.summary().caveat).toBe(CAVEAT);
  });
});

/**
 * The two sources are crossed, never merged. `algebra_relations` calls
 * `[Telo, Para]` commuting; the vendored skeleton measures |η| 0.335 in that
 * direction (pinned in tests/kernel/dissipation.test.ts). The reading reports
 * the disagreement rather than dropping either claim.
 */
describe("crossing the relation against the commutator skeleton", () => {
  it("flags a stated commuting pair the skeleton measures as interacting", () => {
    const reading = ChainReading.read(["Telo", "Para"]);
    const note = reading.pairs[0]!.relations.find((r) => r.family === "neutral-commutation");
    expect(note!.corroboration!.agrees).toBe(false);
    expect(note!.corroboration!.magnitude).toBeCloseTo(0.335, 10);
    expect(note!.corroboration!.reading).toContain("neither overrides the other");
  });

  it("confirms the pair the skeleton and the formalism agree is commuting", () => {
    const reading = ChainReading.read(["Pro", "Kata"]);
    const note = reading.pairs[0]!.relations.find((r) => r.family === "neutral-commutation");
    expect(note!.corroboration!.agrees).toBe(true);
    expect(note!.corroboration!.magnitude).toBe(0);
  });

  it("leaves a composition uncorroborated — |η| is not a claim about composing", () => {
    const reading = ChainReading.read(["Meta", "Ortho"]);
    expect(reading.pairs[0]!.relations[0]!.corroboration).toBeUndefined();
  });
});

describe("what else the reading carries", () => {
  it("names each class in play with what the formalism says that class does", () => {
    const reading = ChainReading.read(["Ana", "Kata"]);
    const disruptive = reading.classes.find((c) => c.className === "B-Disruptive");
    expect(disruptive!.operators).toEqual(["Ana"]);
    expect(disruptive!.characteristics).toBe("Rupture, increase entropy, destabilize");
    expect(disruptive!.commutationBias).toBe("mostly ±1");
  });

  it("names the operators the formalism calls projections onto an attractor", () => {
    const reading = ChainReading.read(["Para", "Kata", "Telo"]);
    expect(reading.projections).toEqual([
      { op: "Para", attractor: "S*" },
      { op: "Telo", attractor: "J=0" },
    ]);
  });

  /**
   * A reading is a report, not a gate: unlike `compileExecutionProgram` it neither
   * rejects nor repairs an illegal chain, it reads it and says what is wrong.
   */
  it("reads a chain that breaks the grammar and reports the violations", () => {
    const reading = ChainReading.read(["Meta", "Non", "Kata"]);
    expect(reading.violations.map((v) => v.constraint)).toContain("non-immediately-after-meta");
    expect(reading.violations[0]!.index).toBe(1);
  });
});
