/**
 * Composes an operator chain into a prompt transformation policy.
 *
 * The sibling `execution.ts` compiles a chain into an ordered *program*: N
 * instructions, executed in sequence, each with its own budget. This file does
 * the other reading of the same notation. `∘` is composition, so what a chain
 * yields is a set of properties the finished prompt exhibits *simultaneously* —
 * `Axis ∘ Ana` is not "frame, then analyse" but "analytical, within a fixed
 * frame". The rendered brief therefore has no per-operator section, and
 * `verify` exists to catch a render that grew one back.
 *
 * Specified in praxis/protaseis/operator-chain-as-prompt-policy.psuedo. Every emitted clause
 * must trace to a named field of an operator, of its `ExecutionMode`, or of its
 * `ExecutionBudget` — a clause traceable to none of those is one the chain did
 * not license.
 *
 * This deliberately does NOT build on `compileExecutionProgram`: that runs
 * `normalizeSequence`, which collapses consecutive repeats into a single run
 * with `iterations > 1`. A policy needs one property per chain element, and its
 * seam costs come from `analyzeSequence`, which never collapses — building on
 * the collapsed form would silently desync the two.
 */

import type { Operator } from "../kernel/index.js";
import { analyzeSequence, operatorEffect } from "../kernel/index.js";
import { checkForbiddenSequence } from "../vocab/grammar.js";
import {
  budgetForBand,
  executionMode,
  type Capability,
  type ExecutionBudget,
} from "../vocab/execution-classes.js";
import { lookupOperator, type AuthoredOperator } from "../vocab/operators.js";
import {
  PromptVocabulary,
  type AdjectiveOverride,
  type AdjectiveSource,
  type PromptLifetime,
  type ResolvedAdjective,
} from "../vocab/prompt-policy.js";
import { lambdaBandFor } from "./compile.js";

/** Per-operator adjective substitutions, keyed by operator. */
export interface ComposeOptions {
  readonly adjectives?: Readonly<Partial<Record<Operator, AdjectiveOverride>>>;
}

/** One operator, read as a property the composed prompt must exhibit. */
export class OperatorProperty {
  private constructor(
    readonly op: Operator,
    readonly symbol: string,
    readonly displayName: string,
    readonly index: number,
    /** The adjective and where it came from — authored table, or this caller. */
    readonly resolvedAdjective: ResolvedAdjective,
    /** The operator's `effect`: what this property licenses that others don't. */
    readonly license: string,
    readonly lifetime: PromptLifetime,
    /** `ExecutionMode.cognitiveMove`. */
    readonly move: string,
    readonly capabilities: readonly Capability[],
    /** `ExecutionMode.requiredArtifact` — the property's exit test. */
    readonly exitTest: string,
    readonly budget: ExecutionBudget,
    readonly effectVector: readonly [number, number],
  ) {}

  static for(op: Operator, override?: AdjectiveOverride): OperatorProperty {
    const entry = OperatorProperty.authored(op);
    const mode = executionMode(op);
    return new OperatorProperty(
      op,
      entry.symbol,
      entry.displayName,
      entry.index,
      PromptVocabulary.resolveAdjective(op, override),
      entry.effect,
      PromptVocabulary.lifetimeFor(entry),
      mode.cognitiveMove,
      mode.capabilities,
      mode.requiredArtifact,
      budgetForBand(lambdaBandFor(entry.lambda)),
      operatorEffect(op),
    );
  }

  private static authored(op: Operator): AuthoredOperator {
    const entry = lookupOperator(op);
    if (entry === undefined) throw new Error(`unknown operator "${op}"`);
    return entry;
  }

  get adjective(): string {
    return this.resolvedAdjective.adjective;
  }

  get adjectiveSource(): AdjectiveSource {
    return this.resolvedAdjective.source;
  }

  /** Stated only where the caller supplied the adjective. */
  get adjectiveReason(): string | undefined {
    return this.resolvedAdjective.reason;
  }

  /**
   * Whether this property may settle a question. B-Disruptive operators are
   * read-only by construction, so a property that attacks the current answer
   * can require alternatives but can never be what the prompt ends on.
   */
  get mayCommit(): boolean {
    return this.capabilities.includes("write");
  }

  /** Audit handle, so a reader can trace any clause back to its operator. */
  get tag(): string {
    return `${this.symbol} ${this.displayName} #${this.index}`;
  }
}

/** The dissipation cost of holding two properties together. */
export interface PromptSeam {
  readonly from: Operator;
  readonly to: Operator;
  readonly lambda: number;
}

export interface PolicyVerification {
  readonly missingOperators: readonly Operator[];
  readonly missingArtifacts: readonly string[];
  readonly perOperatorHeadings: readonly string[];
  /** Operators whose adjective this caller supplied rather than the table —
   * the clauses a reviewer cannot trace to an authored field. */
  readonly callerSuppliedAdjectives: readonly Operator[];
}

export class PromptPolicy {
  private constructor(
    readonly chain: readonly Operator[],
    readonly properties: readonly OperatorProperty[],
    /** Summed `effect_vector` over the chain: `[ΔD, ΔC]`. */
    readonly netEffect: readonly [number, number],
    readonly seams: readonly PromptSeam[],
    readonly lambdaEffective: number,
  ) {}

  /**
   * Rejects rather than repairs, matching `compileExecutionProgram`: a chain
   * that fails the sequence grammar is an error, not something to rewrite.
   *
   * With no options this is a pure function of the chain — the same chain
   * composes the same brief, which is what makes a composed brief replayable.
   * `options.adjectives` is the one seam off that, and it is recorded wherever
   * it is used rather than blended into the authored text.
   */
  static compose(chain: readonly Operator[], options: ComposeOptions = {}): PromptPolicy {
    if (chain.length === 0) throw new Error("cannot compose an empty chain");

    const verdict = checkForbiddenSequence(chain);
    if (!verdict.accepted) {
      throw new Error(`cannot compose: ${verdict.reason} [${verdict.constraint}]`);
    }

    const overrides = options.adjectives ?? {};
    PromptPolicy.rejectOverridesOutsideChain(chain, overrides);
    const properties = chain.map((op) => OperatorProperty.for(op, overrides[op]));
    PromptPolicy.rejectAmbiguousAdjectives(properties);

    const analysis = analyzeSequence(chain);
    const seams = analysis.pairwiseCosts.map((cost, i) => ({
      from: chain[i]!,
      to: chain[i + 1]!,
      lambda: cost.lambda,
    }));

    let netD = 0;
    let netC = 0;
    for (const op of chain) {
      const [dD, dC] = operatorEffect(op);
      netD += dD;
      netC += dC;
    }

    return new PromptPolicy(chain, properties, [netD, netC], seams, analysis.lambdaEffective);
  }

  /** An override for an operator the chain never names is a caller mistake, and
   * silently ignoring it would let a caller believe a word took effect. */
  private static rejectOverridesOutsideChain(
    chain: readonly Operator[],
    overrides: Readonly<Partial<Record<Operator, AdjectiveOverride>>>,
  ): void {
    const absent = Object.keys(overrides).filter((op) => !chain.includes(op as Operator));
    if (absent.length > 0) {
      throw new Error(
        `cannot compose: adjective override given for ${absent.join(", ")}, which the chain does not contain`,
      );
    }
  }

  /**
   * Two *different* operators sharing an adjective make the brief ambiguous
   * about which one a clause came from — the invariant the authored table is
   * tested for, enforced over the composed set so an override cannot break it
   * either. A repeated operator is not a collision: `Kata ∘ Kata` is a legal
   * chain and both occurrences are the same property.
   */
  private static rejectAmbiguousAdjectives(properties: readonly OperatorProperty[]): void {
    const byAdjective = new Map<string, Set<Operator>>();
    for (const property of properties) {
      const key = property.adjective.toLowerCase();
      const holders = byAdjective.get(key);
      if (holders === undefined) byAdjective.set(key, new Set([property.op]));
      else holders.add(property.op);
    }
    for (const [adjective, holders] of byAdjective) {
      if (holders.size > 1) {
        throw new Error(
          `cannot compose: ${[...holders].join(" and ")} would both be "${adjective}", so no clause could be traced to one of them`,
        );
      }
    }
  }

  /**
   * The last property. The formalism's own "must end concrete" constraint
   * (CONSTRAINT.END_ON_ANA) only makes sense if the final operator governs how
   * the output terminates, so the terminal property sets the brief's ending.
   */
  get terminal(): OperatorProperty {
    return this.properties[this.properties.length - 1]!;
  }

  /**
   * Whether the composed policy contracts on both axes. When it does, the
   * divergent properties survive as bounded licenses rather than as a standing
   * instruction to explore openly.
   */
  get netContractive(): boolean {
    return this.netEffect[0] < 0 && this.netEffect[1] < 0;
  }

  /** The seams most likely to tear, costliest first. */
  costliestSeams(limit = 2): readonly PromptSeam[] {
    return [...this.seams].sort((a, b) => b.lambda - a.lambda).slice(0, limit);
  }

  /** Every distinct exit test the chain demands. */
  requiredArtifacts(): readonly string[] {
    return [...new Set(this.properties.map((p) => p.exitTest))];
  }

  /**
   * One composed brief. Never a heading per operator: a section per operator is
   * the step-list reading re-entering through layout.
   */
  render(intent: string): string {
    const lines: string[] = [];
    lines.push(`# Composed brief`);
    lines.push("");
    lines.push(`**Intent.** ${intent.trim()}`);
    lines.push("");
    lines.push(
      `The following ${this.properties.length} characteristics hold over the entire brief ` +
        "simultaneously. They are not phases, and there is no order to work through.",
    );
    lines.push("");

    for (const p of this.properties) {
      lines.push(`- ${this.clauseFor(p)} _(${p.tag})_`);
    }

    lines.push("");
    lines.push(this.closingLine());

    const seams = this.costliestSeams();
    if (seams.length > 0) {
      lines.push("");
      lines.push(
        `Bind these joints explicitly — they carry the highest cost in the chain: ` +
          seams
            .map((s) => `${s.from} with ${s.to} (λ ${s.lambda.toFixed(2)})`)
            .join(", ") +
          ".",
      );
    }

    return lines.join("\n");
  }

  private clauseFor(p: OperatorProperty): string {
    const commit = p.mayCommit
      ? "It may settle a question"
      : "It may never settle a question — it is read-only by construction";
    // A caller-supplied adjective is marked in the brief itself, not only in
    // the verification: whoever reads the brief without the JSON beside it is
    // exactly the reader who would otherwise take the word for an authored one.
    const supplied =
      p.adjectiveSource === "caller"
        ? ` The adjective is the caller's, not this operator's authored "${PromptVocabulary.adjectiveFor(p.op)}": ${p.adjectiveReason}`
        : "";
    return (
      `Work **${p.adjective}**: ${p.move}. This licenses one thing the others do not — ` +
      `${p.license}. ${commit}, and it owes ${p.exitTest}. It ${p.lifetime.phrase}.${supplied}`
    );
  }

  private closingLine(): string {
    const [dD, dC] = this.netEffect;
    const direction = this.netContractive
      ? "The composed policy is net-contractive on both axes: the brief must admit less " +
        "material and tolerate less unresolved tension than it started with, so no clause " +
        "may let it end open."
      : "The composed policy is not net-contractive, so the brief is permitted to end with " +
        "material and tension still open.";
    return (
      `${direction} It ends **${this.terminal.adjective}** (${this.terminal.tag}), which ` +
      `${this.terminal.lifetime.phrase}. ` +
      `[net ΔD ${dD.toFixed(2)}, ΔC ${dC.toFixed(2)}; λ_eff ${this.lambdaEffective.toFixed(3)}]`
    );
  }

  /**
   * Mechanical checks on a rendered brief. A chain member with no surviving
   * clause was dropped rather than composed; a brief carrying a heading per
   * operator lost the policy reading in rendering.
   */
  verify(brief: string): PolicyVerification {
    const missingOperators = this.properties
      .filter((p) => !brief.includes(p.symbol))
      .map((p) => p.op);

    const missingArtifacts = this.requiredArtifacts().filter(
      (artifact) => !brief.includes(artifact),
    );

    const perOperatorHeadings = brief
      .split("\n")
      .filter((line) => /^#{2,}\s/u.test(line))
      .filter((line) => this.properties.some((p) => line.includes(p.op)));

    const callerSuppliedAdjectives = this.properties
      .filter((p) => p.adjectiveSource === "caller")
      .map((p) => p.op);

    return { missingOperators, missingArtifacts, perOperatorHeadings, callerSuppliedAdjectives };
  }
}
