/**
 * A chain read against the formalism's own algebra.
 *
 * `analyze` already answers what a sequence *costs* (λ, trajectory, half-life).
 * What nothing answered is what the formalism *says about the operators in it*:
 * that `Ortho ∘ Ana` is a pair it composes to `Kata`, that `[Telo, Para]` is
 * one of two pairs it calls commuting, that `Vale ∘ Non = Vale` is invariant
 * under collapse. Those statements sat unread in `algebra_relations` — see
 * `src/kernel/algebra.ts` for why they were.
 *
 * Every relation is rendered as a **note, never as a rewrite**. Operators are
 * displacements here, not functions (`docs/ALGEBRA_DYNAMICS_SEAM.md` §1–2), so
 * "this pair composes to Kata" is a fact about the algebra and not permission
 * to replace the pair with Kata, drop an idempotent repeat, or reorder anything.
 * `CAVEAT` says so in the rendered output, because the reader most likely to
 * act on a note is a model.
 *
 * Two sources are crossed here rather than merged: a commutator statement in
 * `algebra_relations` and the vendored skeleton's measured `|η|` are separate
 * claims about the same pair, and where they disagree the reading says so
 * instead of picking a winner — the same stance `commutatorMagnitude` takes
 * toward the skeleton's own sign/magnitude disagreements.
 *
 * The composed-prompt path deliberately does not consume this. Under the policy
 * reading an operator is a property held throughout, not a step, so there is no
 * composition for an absorption law to apply to; see the same pseudocode file.
 */

import {
  ALGEBRA,
  commutatorMagnitude,
  operatorClass,
  operatorClassProfile,
  operatorSymbol,
  type AttractorLabel,
  type Operator,
  type OperatorClass,
  type RelationFamily,
  type RelationMatch,
  type RelationResult,
} from "../kernel/index.js";
import { sequenceViolations, type SequenceViolation } from "../vocab/grammar.js";

export const CAVEAT =
  "These are statements in the formalism's function-space algebra. The engine " +
  "composes displacements, so none of them rewrites, shortens, or reorders the " +
  "chain — read them as what the formalism says these operators have to do with " +
  "one another (docs/ALGEBRA_DYNAMICS_SEAM.md §2).";

/** How the formalism's claim about a pair compares with the skeleton's `|η|`. */
export interface Corroboration {
  readonly magnitude: number;
  readonly agrees: boolean;
  readonly reading: string;
}

/** One relation that applies to one adjacent pair. */
export interface RelationNote {
  readonly statement: string;
  readonly family: RelationFamily;
  /** The other lists carrying this same statement, where the formalism repeats
   * itself — `Non ∘ Kata = Para` is authored in two. Reported rather than
   * deduplicated away, but said once. */
  readonly alsoStatedIn?: readonly RelationFamily[];
  readonly orientation: "as-written" | "reversed";
  readonly reading: string;
  readonly corroboration?: Corroboration;
}

export interface PairReading {
  /** Index of the left operator within the chain. */
  readonly step: number;
  readonly from: Operator;
  readonly to: Operator;
  readonly relations: readonly RelationNote[];
}

/** A class the chain draws on, with what the formalism says that class does. */
export interface ClassPresence {
  readonly className: OperatorClass;
  readonly operators: readonly Operator[];
  readonly characteristics: string;
  readonly commutationBias: string;
}

export interface Projection {
  readonly op: Operator;
  readonly attractor: AttractorLabel;
}

const FAMILY_PREFIX: Readonly<Record<RelationFamily, string>> = {
  absorption: "absorption law",
  triple: "stated relation",
  "neutral-commutation": "stated as commuting",
  "anti-symmetry": "anti-symmetry exception",
  dissipative: "dissipative relation",
  null: "null relation",
};

function formatResult(result: RelationResult): string {
  if (result.kind === "zero") return "0";
  const sign = result.sign === -1 ? "-" : "";
  const scale = result.coefficient === 1 ? "" : `${result.coefficient}·`;
  return `${sign}${scale}${result.op}`;
}

/**
 * The algebraic reading of one chain: what the formalism relates, what classes
 * are in play, and every grammar rule the chain breaks.
 */
export class ChainReading {
  private constructor(
    readonly chain: readonly Operator[],
    readonly pairs: readonly PairReading[],
    readonly classes: readonly ClassPresence[],
    readonly projections: readonly Projection[],
    readonly violations: readonly SequenceViolation[],
  ) {}

  static read(chain: readonly Operator[]): ChainReading {
    const pairs: PairReading[] = [];
    for (let i = 0; i < chain.length - 1; i += 1) {
      const from = chain[i]!;
      const to = chain[i + 1]!;
      const relations = ChainReading.notesFor(ALGEBRA.relationsFor(from, to), from, to);
      if (relations.length > 0) pairs.push({ step: i, from, to, relations });
    }

    return new ChainReading(
      chain,
      pairs,
      ChainReading.classesIn(chain),
      ChainReading.projectionsIn(chain),
      sequenceViolations(chain),
    );
  }

  /** Whether the formalism says anything at all about this chain's pairs. */
  get hasRelations(): boolean {
    return this.pairs.length > 0;
  }

  private static classesIn(chain: readonly Operator[]): ClassPresence[] {
    const grouped = new Map<OperatorClass, Operator[]>();
    for (const op of chain) {
      const className = operatorClass(op);
      const members = grouped.get(className);
      if (members === undefined) grouped.set(className, [op]);
      else if (!members.includes(op)) members.push(op);
    }
    return [...grouped].map(([className, operators]) => {
      const profile = operatorClassProfile(className);
      return {
        className,
        operators,
        characteristics: profile.characteristics,
        commutationBias: profile.commutationBias,
      };
    });
  }

  private static projectionsIn(chain: readonly Operator[]): Projection[] {
    const seen = new Set<Operator>();
    const found: Projection[] = [];
    for (const op of chain) {
      if (seen.has(op)) continue;
      seen.add(op);
      const attractor = ALGEBRA.projectionFor(op);
      if (attractor !== undefined) found.push({ op, attractor });
    }
    return found;
  }

  /**
   * One note per distinct statement. A statement the formalism authored in more
   * than one list would otherwise be read out once per list, saying the same
   * sentence twice under two headings; the repetition is a fact about the
   * source, so it is named rather than dropped.
   */
  private static notesFor(
    matches: readonly RelationMatch[],
    from: Operator,
    to: Operator,
  ): RelationNote[] {
    const grouped = new Map<string, RelationMatch[]>();
    for (const match of matches) {
      const key = `${match.relation.statement}|${match.orientation}`;
      const group = grouped.get(key);
      if (group === undefined) grouped.set(key, [match]);
      else group.push(match);
    }

    return [...grouped.values()].map((group) => {
      const note = ChainReading.noteFor(group[0]!, from, to);
      const alsoStatedIn = group.slice(1).map((match) => match.relation.family);
      if (alsoStatedIn.length === 0) return note;
      return {
        ...note,
        alsoStatedIn,
        reading: `${note.reading} — the formalism repeats this statement under ${alsoStatedIn.join(", ")}`,
      };
    });
  }

  private static noteFor(match: RelationMatch, from: Operator, to: Operator): RelationNote {
    const { relation, orientation } = match;
    const parts = [`${FAMILY_PREFIX[relation.family]}: ${relation.statement}`];
    if (orientation === "reversed") {
      parts.push(`stated for ${to} with ${from}; a commutator is a claim about the pair, and reversing it flips the sign`);
    }
    // `relation.note` is not appended: the statement is verbatim and already
    // carries the parenthetical. It stays on the relation for callers reading
    // the data rather than the prose.
    if (relation.form === "composition") {
      parts.push(
        relation.result.kind === "zero"
          ? "the formalism composes this pair to nothing"
          : `the formalism composes this pair to ${relation.result.op}`,
      );
    }

    const note: RelationNote = {
      statement: relation.statement,
      family: relation.family,
      orientation,
      reading: parts.join(" — "),
    };
    if (relation.form !== "commutator") return note;
    return { ...note, corroboration: ChainReading.corroborate(relation.result, from, to) };
  }

  /**
   * The skeleton's measured `|η|` for the pair beside what the relation claims.
   * A zero-result commutator claims the pair does not interact; a signed one
   * claims it does. Disagreement is reported, not reconciled.
   */
  private static corroborate(
    result: RelationResult,
    from: Operator,
    to: Operator,
  ): Corroboration {
    const magnitude = commutatorMagnitude(from, to);
    const claimsInteraction = result.kind === "operator";
    const measuresInteraction = magnitude !== 0;
    const agrees = claimsInteraction === measuresInteraction;
    const stated = claimsInteraction
      ? `the relation states an interaction (${formatResult(result)})`
      : "the relation states none";
    return {
      magnitude,
      agrees,
      reading: agrees
        ? `the skeleton agrees: |η| ${magnitude} for ${from}→${to}, and ${stated}`
        : `the skeleton disagrees: |η| ${magnitude} for ${from}→${to}, but ${stated}. Both are authored claims; neither overrides the other`,
    };
  }

  /** Lines for a terminal report. Empty when the formalism relates nothing. */
  renderLines(): readonly string[] {
    const lines: string[] = [];

    if (this.hasRelations) {
      lines.push("algebra (not enforced):");
      lines.push(`  ${CAVEAT}`);
      for (const pair of this.pairs) {
        const heading = `  step ${pair.step}: ${operatorSymbol(pair.from)} ${pair.from} ∘ ${operatorSymbol(pair.to)} ${pair.to}`;
        lines.push(heading);
        for (const relation of pair.relations) {
          lines.push(`    - ${relation.reading}`);
          if (relation.corroboration !== undefined) {
            lines.push(`      ${relation.corroboration.reading}`);
          }
        }
      }
    }

    if (this.projections.length > 0) {
      lines.push("projections:");
      for (const projection of this.projections) {
        lines.push(`  ${projection.op} is the formalism's projection onto ${projection.attractor}`);
      }
    }

    if (this.classes.length > 0) {
      lines.push("classes in play:");
      for (const presence of this.classes) {
        lines.push(
          `  ${presence.className} (${presence.operators.join(", ")}) — ${presence.characteristics}; commutation bias ${presence.commutationBias}`,
        );
      }
    }

    return lines;
  }

  /** The same reading as data, for `--json` and the MCP tool. */
  summary(): {
    readonly chain: readonly Operator[];
    readonly caveat: string;
    readonly pairs: readonly PairReading[];
    readonly projections: readonly Projection[];
    readonly classes: readonly ClassPresence[];
    readonly violations: readonly SequenceViolation[];
  } {
    return {
      chain: this.chain,
      caveat: CAVEAT,
      pairs: this.pairs,
      projections: this.projections,
      classes: this.classes,
      violations: this.violations,
    };
  }
}
