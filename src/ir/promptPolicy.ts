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
import { PromptVocabulary, type PromptLifetime } from "../vocab/prompt-policy.js";
import { lambdaBandFor } from "./compile.js";

/** One operator, read as a property the composed prompt must exhibit. */
export class OperatorProperty {
  private constructor(
    readonly op: Operator,
    readonly symbol: string,
    readonly displayName: string,
    readonly index: number,
    readonly adjective: string,
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

  static for(op: Operator): OperatorProperty {
    const entry = OperatorProperty.authored(op);
    const mode = executionMode(op);
    return new OperatorProperty(
      op,
      entry.symbol,
      entry.displayName,
      entry.index,
      PromptVocabulary.adjectiveFor(op),
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
   */
  static compose(chain: readonly Operator[]): PromptPolicy {
    if (chain.length === 0) throw new Error("cannot compose an empty chain");

    const verdict = checkForbiddenSequence(chain);
    if (!verdict.accepted) {
      throw new Error(`cannot compose: ${verdict.reason} [${verdict.constraint}]`);
    }

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

    return new PromptPolicy(
      chain,
      chain.map(OperatorProperty.for),
      [netD, netC],
      seams,
      analysis.lambdaEffective,
    );
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
    return (
      `Work **${p.adjective}**: ${p.move}. This licenses one thing the others do not — ` +
      `${p.license}. ${commit}, and it owes ${p.exitTest}. It ${p.lifetime.phrase}.`
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

    return { missingOperators, missingArtifacts, perOperatorHeadings };
  }
}
