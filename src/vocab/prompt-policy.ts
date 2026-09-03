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
  /** Keyed by operator; every entry traces to that operator's `meaning`. */
  private static readonly ADJECTIVES: Readonly<Record<Operator, string>> = {
    Ana: "analytical", // "Break apart, raise conceptual level"
    Kata: "synthesized", // "Compress, concretize, decrease entropy"
    Meta: "self-examining", // "Reflection, recursive drag"
    Para: "adversarial", // "Deviation, injects instability"
    Non: "negating", // "Negation, structural rupture"
    Telo: "goal-directed", // "Goal projection, stabilizing"
    Retro: "backtracking", // "Backtracking, reverse causality"
    Ortho: "truth-aligned", // "Correction, entropy removal"
    Pro: "forward-looking", // "Forward propagation, identity proxy"
    Echo: "replicating", // "Echo, replicate signal"
    Braid: "entangling", // "Braid, entangle structures"
    Fold: "compactifying", // "Fold, compactify (disruptive)"
    Seed: "generative", // "Instantiation, genesis"
    Crux: "pivot-seeking", // "Core pivot, hinge"
    Weave: "integrative", // "Weave, integrate patterns"
    Bind: "binding", // "Bind, glue (mediator)"
    Axis: "scoped", // "Orienting axis, framing"
    Vale: "collapse-facing", // "Vacuum, void operator (collapse proxy)"
    Flux: "continuously perturbed", // "Continuous perturbation"
    Latch: "evidence-stabilized", // "Locking stabilization"
  };

  static adjectiveFor(op: Operator): string {
    return PromptVocabulary.ADJECTIVES[op];
  }

  /** Every operator carries an adjective; asserted by the vocab test. */
  static allAdjectives(): ReadonlyMap<Operator, string> {
    return new Map(OPERATORS.map((op) => [op, PromptVocabulary.ADJECTIVES[op]]));
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
