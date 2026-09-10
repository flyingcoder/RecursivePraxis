import {
  LYAPUNOV_ALPHA,
  STABILITY_THRESHOLD,
  VOID_C_THRESHOLD,
  VOID_D_THRESHOLD,
  attractorPenalty,
  classifyAttractor,
  suggestTransitionOperators,
} from "./phasePortrait.js";
import { DISTANCE_THRESHOLD, distance, solve } from "./solver.js";
import { STABLE_TARGET_DISSIPATION } from "./derive.js";
import { OPERATORS, type AttractorLabel, type DissipationState, type Operator } from "./types.js";

/**
 * Composing the kernel primitives into the arc a stated intent implies.
 *
 * This is the deterministic half of `praxis/protaseis/derive-state-from-intent.psuedo`: every
 * step the document tags [COMPUTED] or [VERIFIED] lives here, and every step it
 * tags [REASONING] deliberately does not. Reading signals out of a transcript,
 * choosing which of three attractors an intent should land in, and phrasing a
 * diagnosis are judgments a caller makes and a reviewer argues with. Nothing in
 * this file makes them.
 *
 * The seam matters more than it looks. If the band arithmetic or the arc
 * verification were left to the caller, a plausible-looking number would arrive
 * carrying authority no reading can support — which is the failure the whole
 * derivation path exists to prevent.
 */

/**
 * Distance held between a chosen point and the threshold that defines its band.
 *
 * Not decoration. A point sitting exactly on a threshold classifies by float
 * comparison, and the arithmetic really does land there: `0.3 - 0.4 * 0.5`
 * evaluates to 0.09999999999999998, not 0.1. The document fixes the floor at
 * 0.02 and this is that floor.
 */
export const BAND_MARGIN = 0.02;

/** Beam width the CLI's own diagnose path uses; kept identical so a derived arc
 * reports the sequence `lambda solve` would return, not a differently-tuned one. */
export const ARC_BEAM_WIDTH = 10;

export interface ArcPlan {
  readonly initialLabel: AttractorLabel;
  readonly targetLabel: AttractorLabel;
  readonly target: DissipationState;
  /** Operators the formalism maps for this transition. Empty for same-label arcs. */
  readonly suggested: readonly Operator[];
  /**
   * The initial state already is the target attractor. A finding, not an error:
   * "the state your intent describes is already the state you asked for."
   */
  readonly sameLabel: boolean;
  /** The arc runs toward the costlier attractor. A flag, not a rejection. */
  readonly towardCostlierAttractor: boolean;
  /** No target label was stated, so the engine's standing target was used. */
  readonly targetWasDefaulted: boolean;
}

/**
 * A representative point inside the band a label denotes.
 *
 * The document leaves the free axis to the author ("pickIn"). A tool cannot
 * take that freedom and stay deterministic — a random point would make the same
 * intent produce different plans on different runs — so the choice is resolved
 * here, once, at the midpoint of each legal range. Every bound is read from the
 * kernel constants rather than hardcoded, because ALPHA and the thresholds load
 * from formalism.json: a change there has to move these points with it.
 */
export function numbersForLabel(label: AttractorLabel): DissipationState {
  switch (label) {
    case "J=0":
      // The stable band's representative is the engine's standing target
      // itself. Deriving a second, nearby J=0 point would mean an
      // intent-derived arc and an engine-planned one quietly aim at different
      // places while both calling it "J=0".
      return STABLE_TARGET_DISSIPATION;

    case "S*": {
      // Both axes strictly inside their bands: V >= STABILITY_THRESHOLD holds
      // because D alone already exceeds it.
      const D = (STABILITY_THRESHOLD + VOID_D_THRESHOLD) / 2;
      const C = VOID_C_THRESHOLD / 2;
      return { D, C };
    }

    case "∅": {
      // One axis over its threshold suffices. D is the axis to push, since
      // D > 0.8 also carries V past STABILITY_THRESHOLD for free.
      const D = VOID_D_THRESHOLD + BAND_MARGIN;
      const C = VOID_C_THRESHOLD / 2;
      return { D, C };
    }
  }
}

/**
 * Steps 3, 3b and 3c: where this intent should land, and whether the formalism
 * can tell that arc at all.
 *
 * `targetLabel` is the caller's one irreducible judgment, and it is a choice
 * among three values rather than a continuum of (D, C) pairs — which is what
 * makes it a judgment a reviewer can actually check. Omit it and the engine's
 * standing target is used.
 */
export function planArc(
  initial: DissipationState,
  targetLabel?: AttractorLabel,
): ArcPlan {
  const initialLabel = classifyAttractor(initial.D, initial.C);

  const targetWasDefaulted = targetLabel === undefined;
  const target = targetWasDefaulted ? STABLE_TARGET_DISSIPATION : numbersForLabel(targetLabel);
  const resolvedTarget = targetLabel ?? classifyAttractor(target.D, target.C);

  const suggested = suggestTransitionOperators(initialLabel, resolvedTarget);

  return {
    initialLabel,
    targetLabel: resolvedTarget,
    target,
    suggested,
    // Empty for exactly the three same-label arcs and non-empty for all six
    // cross-label ones. Report it; never re-roll the target to manufacture a
    // non-empty arc, which would be fabricating a problem to have one to solve.
    sameLabel: suggested.length === 0,
    towardCostlierAttractor: attractorPenalty(resolvedTarget) > attractorPenalty(initialLabel),
    targetWasDefaulted,
  };
}

/** Operator names appearing as whole words in an authored diagnosis string. */
export function operatorsNamedIn(diagnosis: string): readonly Operator[] {
  return OPERATORS.filter((op) => new RegExp(`\\b${op}\\b`).test(diagnosis));
}

export interface ArcVerification {
  readonly initialLabel: AttractorLabel;
  readonly targetLabel: AttractorLabel;
  readonly sequence: readonly Operator[];
  /** The solver reached within DISTANCE_THRESHOLD of the target. */
  readonly success: boolean;
  /** The operator algebra could not reach this target. Distinct from an empty plan. */
  readonly partial: boolean;
  /**
   * The initial state was already inside the solver's success radius, so the
   * empty sequence is the whole answer.
   *
   * Reported separately because `success` is true in both cases and cannot tell
   * them apart: a caller that prints "SUCCESS" here announces a solved plan
   * when the truth is "nothing to do".
   */
  readonly alreadyWithinRadius: boolean;
  readonly distance: number;
  /**
   * Operators the diagnosis names that the solver never reaches for.
   *
   * A flag, never an auto-fix. The shipped `stuck` template is a live instance:
   * its diagnosis names Meta and the solver returns Axis ∘ Telo ∘ Telo. That
   * template describes the CAUSE, not the cure, so wiring this to rewrite the
   * text would destroy correct authored prose.
   */
  readonly unusedDiagnosisOperators: readonly Operator[];
}

export interface VerifyArcInput {
  readonly initial: DissipationState;
  readonly target: DissipationState;
  /** Claimed labels, rejected if they disagree with the kernel. */
  readonly initialLabel?: AttractorLabel | undefined;
  readonly targetLabel?: AttractorLabel | undefined;
  /** Authored diagnosis text, cross-checked against the solved sequence. */
  readonly diagnosis?: string | undefined;
}

/**
 * Steps 6 and 7: the label claims and the arc claim, checked against the real
 * kernel rather than trusted.
 *
 * A claimed label that disagrees with `classifyAttractor` throws. Nothing is
 * presented to a user as a label until this passes, and the check is cheap
 * enough that there is no excuse for skipping it.
 */
export function verifyArc(input: VerifyArcInput): ArcVerification {
  const { initial, target } = input;

  const initialLabel = classifyAttractor(initial.D, initial.C);
  const targetLabel = classifyAttractor(target.D, target.C);

  if (input.initialLabel !== undefined && input.initialLabel !== initialLabel) {
    throw new Error(
      `initial (D=${initial.D}, C=${initial.C}) classifies as ${initialLabel}, not the claimed ${input.initialLabel}`,
    );
  }
  if (input.targetLabel !== undefined && input.targetLabel !== targetLabel) {
    throw new Error(
      `target (D=${target.D}, C=${target.C}) classifies as ${targetLabel}, not the claimed ${input.targetLabel}`,
    );
  }

  const solution = solve({ initial, target, beamWidth: ARC_BEAM_WIDTH });
  const separation = distance(initial, target);

  const unusedDiagnosisOperators =
    input.diagnosis === undefined
      ? []
      : operatorsNamedIn(input.diagnosis).filter((op) => !solution.sequence.includes(op));

  return {
    initialLabel,
    targetLabel,
    sequence: solution.sequence,
    success: solution.success,
    partial: !solution.success,
    alreadyWithinRadius: separation <= DISTANCE_THRESHOLD,
    distance: separation,
    unusedDiagnosisOperators,
  };
}
