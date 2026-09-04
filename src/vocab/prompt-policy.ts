/**
 * Authored prose policy for reading an operator as a *property of a prompt*
 * rather than as a step in a procedure.
 *
 * Like `execution-classes.ts`, this is **authored policy for this engine**, not
 * part of the ported formalism. `src/assets/formalism.json` supplies each
 * operator's `meaning`, `effect`, and `idempotent`; everything here is how
 * RecursivePraxis chooses to *phrase* an operator carrying those values when it
 * composes a prompt. Changing a table here changes emitted prose, not the
 * formalism.
 *
 * Specified in praxis/protaseis/operator-chain-as-prompt-policy.psuedo (Step 1a adjective,
 * Step 1d lifetime), where both mappings are tagged [REASONING]: the formalism
 * states the algebra, never its prose consequence.
 */

import type { Idempotence, Operator } from "../kernel/index.js";
import { OPERATORS } from "../kernel/index.js";
import type { AuthoredOperator } from "./operators.js";

export type PromptLifetimeKind = "standing" | "decaying" | "one-shot";

/** Where a composed property's adjective came from. */
export type AdjectiveSource = "authored" | "caller";

/** A caller's substitute for one operator's authored adjective. */
export interface AdjectiveOverride {
  readonly adjective: string;
  /** Why the authored adjective misfits this particular intent. Required. */
  readonly reason: string;
}

export interface ResolvedAdjective {
  readonly adjective: string;
  readonly source: AdjectiveSource;
  /** Present only for a caller-supplied adjective. */
  readonly reason?: string;
}

export interface PromptLifetime {
  readonly kind: PromptLifetimeKind;
  /** How the lifetime is said in an emitted brief. */
  readonly phrase: string;
  /** Present only for `"decaying"`: the coefficient the formalism's rule states. */
  readonly coefficient?: number;
}

/** `Op² = 0.6·Meta` — the shape every `"semi"` operator's rule takes. */
const SEMI_RULE = /=\s*(\d*\.?\d+)\s*·/u;

/**
 * Turns an operator into the vocabulary a composed prompt uses for it.
 *
 * The adjective table is the load-bearing judgment call in the whole
 * meta-prompting feature: it is what converts `meaning` from an instruction
 * ("break the topic apart") into a characteristic the finished prompt must
 * exhibit throughout ("analytical"). Each entry is authored from that
 * operator's `meaning` field and should be re-read against it if the formalism
 * ever changes.
 */
export class PromptVocabulary {
  /**
   * Keyed by operator. `from` is the `meaning` the adjective was read off,
   * copied here so the derivation is checkable: the vocab test asserts it still
   * equals `operatorMeaning(op)`, and a formalism edit that moves a meaning
   * therefore fails loudly instead of leaving a stale word behind. The pin says
   * the adjective was derived from *this* text — not that it is the right word
   * for it, which stays a judgment a reviewer has to make.
   */
  private static readonly ADJECTIVES: Readonly<
    Record<Operator, { readonly adjective: string; readonly from: string }>
  > = {
    Ana: { adjective: "analytical", from: "Break apart, raise conceptual level" },
    Kata: { adjective: "synthesized", from: "Compress, concretize, decrease entropy" },
    Meta: { adjective: "self-examining", from: "Reflection, recursive drag" },
    Para: { adjective: "adversarial", from: "Deviation, injects instability" },
    Non: { adjective: "negating", from: "Negation, structural rupture" },
    Telo: { adjective: "goal-directed", from: "Goal projection, stabilizing" },
    Retro: { adjective: "backtracking", from: "Backtracking, reverse causality" },
    Ortho: { adjective: "truth-aligned", from: "Correction, entropy removal" },
    Pro: { adjective: "forward-looking", from: "Forward propagation, identity proxy" },
    Echo: { adjective: "replicating", from: "Echo, replicate signal" },
    Braid: { adjective: "entangling", from: "Braid, entangle structures" },
    Fold: { adjective: "compactifying", from: "Fold, compactify (disruptive)" },
    Seed: { adjective: "generative", from: "Instantiation, genesis" },
    Crux: { adjective: "pivot-seeking", from: "Core pivot, hinge" },
    Weave: { adjective: "integrative", from: "Weave, integrate patterns" },
    Bind: { adjective: "binding", from: "Bind, glue (mediator)" },
    Axis: { adjective: "scoped", from: "Orienting axis, framing" },
    Vale: { adjective: "collapse-facing", from: "Vacuum, void operator (collapse proxy)" },
    Flux: { adjective: "continuously perturbed", from: "Continuous perturbation" },
    Latch: { adjective: "evidence-stabilized", from: "Locking stabilization" },
  };

  /** An adjective is one short phrase. Longest authored entry is 22 characters. */
  private static readonly MAX_ADJECTIVE_LENGTH = 40;

  static adjectiveFor(op: Operator): string {
    return PromptVocabulary.ADJECTIVES[op].adjective;
  }

  /** The `meaning` text this operator's adjective was authored from. */
  static adjectiveSourceText(op: Operator): string {
    return PromptVocabulary.ADJECTIVES[op].from;
  }

  /** Every operator carries an adjective; asserted by the vocab test. */
  static allAdjectives(): ReadonlyMap<Operator, string> {
    return new Map(OPERATORS.map((op) => [op, PromptVocabulary.adjectiveFor(op)]));
  }

  /**
   * The adjective to compose with, and where it came from.
   *
   * The authored table is the default and the only deterministic answer: the
   * same chain composes the same brief. A caller may substitute a word for one
   * operator — the seam exists because the authored adjective is intent-blind,
   * and `analytical` reads differently over a literature review than over a
   * crash triage — but a substitution is *recorded*, never silently adopted.
   * `source` and `reason` travel with the property into the rendered brief and
   * into `PromptPolicy.verify`, so a reviewer can always separate the clauses
   * the chain licensed from the clauses the caller asked for. Without that,
   * a model-chosen adjective would wear the operator's authority, which is the
   * failure `no-invented-measurement` names for `D`/`C` and the same shape
   * here.
   *
   * A reason is required for the same purpose: an override nobody explained is
   * indistinguishable from a preference.
   */
  static resolveAdjective(op: Operator, override?: AdjectiveOverride): ResolvedAdjective {
    if (override === undefined) {
      return { adjective: PromptVocabulary.adjectiveFor(op), source: "authored" };
    }

    const adjective = override.adjective.trim();
    const reason = override.reason.trim();
    if (adjective.length === 0) {
      throw new Error(`${op}: an adjective override cannot be empty`);
    }
    if (adjective.length > PromptVocabulary.MAX_ADJECTIVE_LENGTH) {
      throw new Error(
        `${op}: "${adjective}" is ${adjective.length} characters; an adjective is one short phrase, at most ${PromptVocabulary.MAX_ADJECTIVE_LENGTH}`,
      );
    }
    if (/[\r\n]/u.test(adjective)) {
      throw new Error(`${op}: an adjective override must be a single phrase, not multiple lines`);
    }
    if (reason.length === 0) {
      throw new Error(
        `${op}: an adjective override must say why the authored "${PromptVocabulary.adjectiveFor(op)}" misfits this intent`,
      );
    }
    return { adjective, source: "caller", reason };
  }

  /**
   * How long a property stays in force, read off the operator's idempotence.
   *
   * Fails closed on a `"semi"` operator whose rule does not state a
   * coefficient: a decaying property with an unknown decay is not something to
   * paper over with a default, and the same reject-don't-repair stance governs
   * `compileExecutionProgram` and `bindExecutionProgram`.
   */
  static lifetimeFor(entry: AuthoredOperator): PromptLifetime {
    switch (entry.idempotent) {
      case true:
        return { kind: "standing", phrase: "holds at all times" };
      case false:
        return { kind: "one-shot", phrase: "gets one pass and must not be re-opened" };
      case "semi": {
        const coefficient = PromptVocabulary.semiCoefficient(entry);
        return {
          kind: "decaying",
          phrase: `gets one pass; a second returns only ${coefficient} of the first`,
          coefficient,
        };
      }
    }
  }

  private static semiCoefficient(entry: AuthoredOperator): number {
    if (entry.idempotenceRule === undefined) {
      throw new Error(
        `${entry.name} is semi-idempotent but states no idempotence_rule; ` +
          "cannot phrase its decay without the coefficient",
      );
    }
    const match = SEMI_RULE.exec(entry.idempotenceRule);
    if (match === null) {
      throw new Error(
        `${entry.name}'s idempotence_rule "${entry.idempotenceRule}" does not state a ` +
          'coefficient in the expected "X² = c·X" form',
      );
    }
    return Number(match[1]);
  }
}

export type { Idempotence };
