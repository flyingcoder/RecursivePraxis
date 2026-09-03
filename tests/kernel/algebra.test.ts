import { describe, expect, it } from "vitest";
import formalismData from "../../src/assets/formalism.json" with { type: "json" };
import { ALGEBRA, RelationParser } from "../../src/kernel/algebra.js";

const algebraRelations = (
  formalismData as unknown as {
    algebra_relations: {
      absorption_laws: string[];
      triple_relations: string[];
      neutral_commutations: string[];
      anti_symmetry_exceptions: string[];
      dissipative_relations: string[];
      identity_and_null: { null: string; projections: Record<string, string> };
    };
  }
).algebra_relations;

/**
 * `algebra_relations` was inert data until this module read it, so these tests
 * are as much a check that the block still says what the parser assumes as they
 * are a check of the parser. A statement the grammar cannot read throws at load
 * — the point of the first test is that the shipped file never does.
 */
describe("parsing the shipped algebra_relations", () => {
  it("reads every authored statement, from every family", () => {
    const expected =
      algebraRelations.absorption_laws.length +
      algebraRelations.triple_relations.length +
      algebraRelations.neutral_commutations.length +
      algebraRelations.anti_symmetry_exceptions.length +
      algebraRelations.dissipative_relations.length +
      1; // identity_and_null.null

    expect(ALGEBRA.all()).toHaveLength(expected);
  });

  it("keeps every statement verbatim, so a rendering can be checked against it", () => {
    const statements = ALGEBRA.all().map((relation) => relation.statement);
    for (const authored of algebraRelations.absorption_laws) {
      expect(statements).toContain(authored);
    }
    expect(statements).toContain(algebraRelations.identity_and_null.null);
  });

  it("reads a composition into its operands and result", () => {
    const relation = ALGEBRA.all().find((r) => r.statement === "Ortho ∘ Ana = Kata");
    expect(relation).toBeDefined();
    expect(relation!.form).toBe("composition");
    expect(relation!.family).toBe("absorption");
    expect(relation!.left).toEqual({ kind: "operator", op: "Ortho" });
    expect(relation!.right).toEqual({ kind: "operator", op: "Ana" });
    expect(relation!.result).toEqual({ kind: "operator", op: "Kata", sign: 1, coefficient: 1 });
  });

  it("carries the sign and coefficient of a dissipative commutator", () => {
    const relation = ALGEBRA.all().find((r) => r.family === "dissipative" && r.statement.startsWith("[Ana, Non]"));
    expect(relation!.form).toBe("commutator");
    expect(relation!.result).toEqual({ kind: "operator", op: "Non", sign: 1, coefficient: 0.9 });
    expect(relation!.note).toBe("λ_rupture");
  });

  it("reads a negative commutator result", () => {
    const relation = ALGEBRA.all().find((r) => r.statement === "[Telo, Meta] = -Telo");
    expect(relation!.result).toEqual({ kind: "operator", op: "Telo", sign: -1, coefficient: 1 });
  });

  it("reads the null relation as zero rather than as an operator", () => {
    const relation = ALGEBRA.all().find((r) => r.family === "null");
    expect(relation!.statement).toBe("Non ∘ Non = 0");
    expect(relation!.result).toEqual({ kind: "zero" });
  });
});

describe("wildcards", () => {
  it("reads X as any operator, so the terminal absorber applies to every left side", () => {
    for (const left of ["Ana", "Vale", "Kata"] as const) {
      const statements = ALGEBRA.relationsFor(left, "Telo").map((m) => m.relation.statement);
      expect(statements).toContain("X ∘ Telo = Telo (terminal absorber)");
    }
  });

  it("reads AnyConstructive as the class, not as an operator name", () => {
    const constructive = ALGEBRA.relationsFor("Vale", "Kata").map((m) => m.relation.statement);
    expect(constructive).toContain("[Vale, AnyConstructive] = +Vale");

    const disruptive = ALGEBRA.relationsFor("Vale", "Ana").map((m) => m.relation.statement);
    expect(disruptive).not.toContain("[Vale, AnyConstructive] = +Vale");
  });
});

describe("matching a pair", () => {
  it("matches a composition in the written order only", () => {
    expect(ALGEBRA.relationsFor("Ortho", "Ana").map((m) => m.relation.statement)).toContain(
      "Ortho ∘ Ana = Kata",
    );
    expect(ALGEBRA.relationsFor("Ana", "Ortho").map((m) => m.relation.statement)).not.toContain(
      "Ortho ∘ Ana = Kata",
    );
  });

  /**
   * `[A, B] = -[B, A]`, so a commutator statement is about the pair rather than
   * about one order. It is reported for the reversed pair and flagged, which is
   * the honest option: silently re-signing it would invent an algebraic claim
   * the formalism does not state.
   */
  it("matches a commutator in both orders, flagging the reversed one", () => {
    const asWritten = ALGEBRA.relationsFor("Meta", "Retro").find(
      (m) => m.relation.statement === "[Meta, Retro] = +Retro",
    );
    const reversed = ALGEBRA.relationsFor("Retro", "Meta").find(
      (m) => m.relation.statement === "[Meta, Retro] = +Retro",
    );
    expect(asWritten!.orientation).toBe("as-written");
    expect(reversed!.orientation).toBe("reversed");
  });

  it("says nothing about a pair the formalism does not relate", () => {
    expect(ALGEBRA.relationsFor("Braid", "Crux")).toEqual([]);
  });
});

describe("the operator's algebraic neighbourhood", () => {
  it("collects every statement naming an operator, on either side or as a result", () => {
    const statements = ALGEBRA.relationsNaming("Kata").map((r) => r.statement);
    expect(statements).toContain("Para ∘ Kata = Ana"); // right operand
    expect(statements).toContain("Ortho ∘ Ana = Kata"); // result
  });

  it("reads the projections, which name one operator per attractor", () => {
    expect(ALGEBRA.projectionFor("Telo")).toBe("J=0");
    expect(ALGEBRA.projectionFor("Para")).toBe("S*");
    expect(ALGEBRA.projectionFor("Kata")).toBeUndefined();
  });
});

/**
 * Fail-closed, matching `PromptVocabulary.semiCoefficient`: a relation nobody
 * can read is not something to skip quietly, because a skipped statement looks
 * exactly like a formalism that says nothing about that pair.
 */
describe("rejecting what it cannot read", () => {
  const parser = new RelationParser("absorption");

  it("rejects a statement in neither form", () => {
    expect(() => parser.parse("Kata is nice")).toThrow(/neither/u);
  });

  it("rejects an operand that is not an operator", () => {
    expect(() => parser.parse("Kata ∘ Nope = Kata")).toThrow(/not an operator/u);
  });

  it("rejects a right-hand side that is not an operator or zero", () => {
    expect(() => parser.parse("Kata ∘ Ana = Nope")).toThrow(/unreadable right-hand side/u);
  });
});
