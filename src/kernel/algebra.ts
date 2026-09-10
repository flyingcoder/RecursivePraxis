/**
 * `algebra_relations` from `formalism.json`, parsed into queryable relations.
 *
 * Until now this block was the largest inert region of the formalism: it is the
 * only place the spec says two *named* operators collapse into a third, and
 * nothing read it. This module is the
 * read; it is deliberately not an enforcement.
 *
 * **Not enforced, and must not become enforcement.** Under
 * `docs/ALGEBRA_DYNAMICS_SEAM.md` §1–2 an operator is a *displacement*, not a
 * function, so `Ortho ∘ Ana = Kata` makes no claim the engine can apply: it
 * does not license rewriting that pair as `Kata`, and `Kata² = Kata` does not
 * make a repeated descent free. What these relations are good for is telling a
 * reader — a person or an agent — that the formalism considers a pair
 * *related*, which nothing else in the system says. Everything here is
 * therefore descriptive, and every consumer renders it as a note.
 *
 * `algebra_relations.idempotence` is deliberately **not** read here: every
 * operator already carries `idempotent` / `idempotence_rule`, and
 * `operatorIdempotence` serves them. Parsing the duplicate list would create a
 * second source of truth for one fact.
 *
 * Parsing is fail-closed at module load: a statement this grammar cannot read,
 * or one naming something that is not an operator, throws rather than being
 * skipped, matching the reject-don't-repair stance in `compileExecutionProgram`.
 */

import formalismData from "../assets/formalism.json" with { type: "json" };
import { operatorClass } from "./formalism.js";
import { OPERATORS, type AttractorLabel, type Operator, type OperatorClass } from "./types.js";

/** Which `algebra_relations` list a statement was authored in. */
export type RelationFamily =
  | "absorption"
  | "triple"
  | "neutral-commutation"
  | "anti-symmetry"
  | "dissipative"
  | "null";

/** `A ∘ B = C` (order-sensitive) versus `[A, B] = …` (a property of the pair). */
export type RelationForm = "composition" | "commutator";

/**
 * One side of a relation. The formalism writes two wildcards — `X` for any
 * operator (`X ∘ Telo = Telo`) and `AnyConstructive` for a whole class
 * (`[Vale, AnyConstructive] = +Vale`).
 */
export type RelationOperand =
  | { readonly kind: "operator"; readonly op: Operator }
  | { readonly kind: "any" }
  | { readonly kind: "class"; readonly className: OperatorClass };

/** The right-hand side: an operator, possibly signed and scaled, or zero. */
export type RelationResult =
  | { readonly kind: "operator"; readonly op: Operator; readonly sign: 1 | -1; readonly coefficient: number }
  | { readonly kind: "zero" };

export interface OperatorRelation {
  readonly family: RelationFamily;
  readonly form: RelationForm;
  readonly left: RelationOperand;
  readonly right: RelationOperand;
  readonly result: RelationResult;
  /** The parenthetical the formalism attaches, e.g. "terminal absorber". */
  readonly note?: string;
  /** The statement verbatim, so a reader can check any rendering against it. */
  readonly statement: string;
}

/**
 * A relation found to apply to an ordered pair.
 *
 * `orientation` exists because `∘` is order-sensitive and `[A, B]` is not a
 * claim about one order only — `[A, B] = -[B, A]`, so a commutator statement is
 * reported for the reversed pair too, flagged rather than silently re-signed.
 * Composition statements are only ever matched as written.
 */
export interface RelationMatch {
  readonly relation: OperatorRelation;
  readonly orientation: "as-written" | "reversed";
}

const CLASS_WILDCARDS: Readonly<Record<string, OperatorClass>> = {
  AnyConstructive: "A-Constructive",
  AnyDisruptive: "B-Disruptive",
  AnyReflexive: "C-Reflexive",
  AnyStructural: "D-Structural",
};

const COMPOSITION = /^(\S+)\s*∘\s*(\S+)\s*=\s*(\S+)(?:\s*\((.+)\))?$/u;
const COMMUTATOR = /^\[\s*(\S+)\s*,\s*(\S+)\s*\]\s*=\s*(\S+)(?:\s*\((.+)\))?$/u;
const RESULT_TERM = /^([+-])?(?:(\d*\.?\d+)·)?(\S+)$/u;
const PROJECTION = /^(\S+)\s*=\s*proj_\{(.+)\}$/u;

interface FormalismAlgebraRelations {
  readonly absorption_laws: readonly string[];
  readonly triple_relations: readonly string[];
  readonly neutral_commutations: readonly string[];
  readonly anti_symmetry_exceptions: readonly string[];
  readonly dissipative_relations: readonly string[];
  readonly identity_and_null: {
    readonly null: string;
    readonly projections: Readonly<Record<string, string>>;
  };
}

interface FormalismAlgebraDocument {
  readonly algebra_relations: FormalismAlgebraRelations;
}

const relations = (formalismData as unknown as FormalismAlgebraDocument).algebra_relations;

function isOperator(value: string): value is Operator {
  return (OPERATORS as readonly string[]).includes(value);
}

/**
 * Reads one authored statement into an `OperatorRelation`.
 *
 * Kept a class rather than loose functions so the family being parsed is state
 * the methods share, and so a caller that ever needs a second relation source
 * (a variant formalism, a test fixture) constructs another parser instead of
 * editing this one.
 */
export class RelationParser {
  constructor(private readonly family: RelationFamily) {}

  parseAll(statements: readonly string[]): OperatorRelation[] {
    return statements.map((statement) => this.parse(statement));
  }

  parse(statement: string): OperatorRelation {
    const composition = COMPOSITION.exec(statement);
    if (composition !== null) {
      return this.build("composition", statement, composition);
    }
    const commutator = COMMUTATOR.exec(statement);
    if (commutator !== null) {
      return this.build("commutator", statement, commutator);
    }
    throw new Error(
      `algebra_relations.${this.family}: "${statement}" is neither "A ∘ B = C" nor "[A, B] = R"`,
    );
  }

  private build(form: RelationForm, statement: string, match: RegExpExecArray): OperatorRelation {
    const [, rawLeft, rawRight, rawResult, note] = match;
    const relation = {
      family: this.family,
      form,
      left: this.operand(rawLeft!, statement),
      right: this.operand(rawRight!, statement),
      result: this.result(rawResult!, statement),
      statement,
    };
    return note === undefined ? relation : { ...relation, note };
  }

  private operand(raw: string, statement: string): RelationOperand {
    if (raw === "X") return { kind: "any" };
    const className = CLASS_WILDCARDS[raw];
    if (className !== undefined) return { kind: "class", className };
    if (isOperator(raw)) return { kind: "operator", op: raw };
    throw new Error(
      `algebra_relations.${this.family}: "${statement}" names "${raw}", which is not an operator or a known wildcard`,
    );
  }

  private result(raw: string, statement: string): RelationResult {
    if (raw === "0") return { kind: "zero" };
    const term = RESULT_TERM.exec(raw);
    const name = term?.[3];
    if (term === undefined || term === null || name === undefined || !isOperator(name)) {
      throw new Error(
        `algebra_relations.${this.family}: "${statement}" has an unreadable right-hand side "${raw}"`,
      );
    }
    return {
      kind: "operator",
      op: name,
      sign: term[1] === "-" ? -1 : 1,
      coefficient: term[2] === undefined ? 1 : Number(term[2]),
    };
  }
}

function parseRelations(): readonly OperatorRelation[] {
  return [
    ...new RelationParser("absorption").parseAll(relations.absorption_laws),
    ...new RelationParser("triple").parseAll(relations.triple_relations),
    ...new RelationParser("neutral-commutation").parseAll(relations.neutral_commutations),
    ...new RelationParser("anti-symmetry").parseAll(relations.anti_symmetry_exceptions),
    ...new RelationParser("dissipative").parseAll(relations.dissipative_relations),
    ...new RelationParser("null").parseAll([relations.identity_and_null.null]),
  ];
}

/**
 * `identity_and_null.projections`: the one operator the formalism names as the
 * projection onto each attractor (`Telo = proj_{J=0}`, `Para = proj_{S*}`).
 * Parsed here rather than in the phase portrait because it is a statement about
 * operators, not about the state space.
 */
function parseProjections(): ReadonlyMap<Operator, AttractorLabel> {
  const parsed = new Map<Operator, AttractorLabel>();
  for (const [label, statement] of Object.entries(relations.identity_and_null.projections)) {
    const match = PROJECTION.exec(statement);
    const name = match?.[1];
    if (name === undefined || !isOperator(name)) {
      throw new Error(
        `algebra_relations.identity_and_null.projections["${label}"]: "${statement}" does not read as "<Operator> = proj_{…}"`,
      );
    }
    parsed.set(name, label as AttractorLabel);
  }
  return parsed;
}

/**
 * The parsed relations, queryable by pair or by operator.
 *
 * Instantiable so a caller can read a different relation set (a variant
 * formalism, a fixture) without touching this module; `ALGEBRA` is the one
 * built from the shipped `formalism.json`.
 */
export class OperatorAlgebra {
  constructor(
    private readonly relations: readonly OperatorRelation[],
    private readonly projections: ReadonlyMap<Operator, AttractorLabel>,
  ) {}

  static fromFormalism(): OperatorAlgebra {
    return new OperatorAlgebra(parseRelations(), parseProjections());
  }

  all(): readonly OperatorRelation[] {
    return this.relations;
  }

  /**
   * Every relation the formalism states about applying `right` after `left`.
   *
   * Composition statements match in the written order only. The chain
   * convention this follows is the repo's own display order — `analyze` and
   * `diagnose` both print a sequence as `A ∘ B` meaning A then B — not the
   * right-to-left reading of function composition. Nothing downstream applies
   * the rewrite, so the convention decides what gets *shown*, not what happens.
   */
  relationsFor(left: Operator, right: Operator): readonly RelationMatch[] {
    const matches: RelationMatch[] = [];
    for (const relation of this.relations) {
      if (this.operandMatches(relation.left, left) && this.operandMatches(relation.right, right)) {
        matches.push({ relation, orientation: "as-written" });
        continue;
      }
      if (
        relation.form === "commutator" &&
        this.operandMatches(relation.left, right) &&
        this.operandMatches(relation.right, left)
      ) {
        matches.push({ relation, orientation: "reversed" });
      }
    }
    return matches;
  }

  /** Every relation naming this operator anywhere — its algebraic neighbourhood. */
  relationsNaming(op: Operator): readonly OperatorRelation[] {
    return this.relations.filter(
      (relation) =>
        this.operandMatches(relation.left, op) ||
        this.operandMatches(relation.right, op) ||
        (relation.result.kind === "operator" && relation.result.op === op),
    );
  }

  /** The attractor this operator projects onto, where the formalism names one. */
  projectionFor(op: Operator): AttractorLabel | undefined {
    return this.projections.get(op);
  }

  private operandMatches(operand: RelationOperand, op: Operator): boolean {
    switch (operand.kind) {
      case "operator":
        return operand.op === op;
      case "class":
        return operatorClass(op) === operand.className;
      case "any":
        return true;
    }
  }
}

export const ALGEBRA = OperatorAlgebra.fromFormalism();
