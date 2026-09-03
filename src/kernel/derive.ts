import type { DissipationState } from "./types.js";

/**
 * Turning observable signals into a dissipation state.
 *
 * This is deliberately not part of `dissipation.ts`, which is about λ cost
 * accumulated *over an operator sequence* — a different quantity that happens
 * to share a word. What lives here is the one-way map from things a reader can
 * point at in a transcript to the `(D, C)` pair the solver searches from.
 *
 * The rule this module exists to enforce: a free-text intent must NEVER be
 * read directly into a `(D, C)` pair. Reading "I keep rewriting the same
 * function" and emitting `{ D: 0.85, C: 0.75 }` is inventing a measurement —
 * the numbers carry four significant figures of authority the reading cannot
 * support, and nothing downstream can tell them apart from numbers that were
 * derived. The intent is read into SIGNALS, and a fixed formula turns signals
 * into numbers: the judgment stays visible and arguable, the arithmetic stays
 * checkable.
 *
 * It lives in the kernel rather than in `engine/` because both the engine's
 * planner and the intent-derivation path need it, and the kernel may not
 * import from the engine. A second copy of the formula is exactly the drift
 * this arrangement prevents.
 */

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * The four readings the formula consumes.
 *
 * Note the asymmetry, which is load-bearing: `uncertainty` is the only free
 * scalar, and it is the one to be most suspicious of. The other three are
 * counts of nameable things — a reviewer can challenge "that check didn't
 * fail" or "that claim was resolved last turn" by name, which is the entire
 * difference between this and picking D = 0.85 by feel.
 *
 * `ObservableTaskState` in `engine/core.ts` satisfies this structurally.
 * Declaring it here rather than as a `Pick<ObservableTaskState, …>` is what
 * keeps the kernel free of an engine dependency.
 */
export interface IntentSignals {
  /** 0..1. The free scalar — prefer moving weight onto the countable fields. */
  readonly uncertainty: number;
  /** Things that demonstrably failed. */
  readonly failedChecks: readonly unknown[];
  /** Assertions nothing has settled. */
  readonly unresolvedClaims: readonly unknown[];
  /** Whether two stated requirements are mutually exclusive. */
  readonly contradictionDetected: boolean;
}

/**
 * Authored constants, not measured. Named rather than inlined so the sweep
 * test can reference the same values the formula uses, and so a recalibration
 * is a one-line diff at a findable place.
 *
 * The intercepts set the floor: D = 0.2, C = 0.15, giving V = 0.26 against a
 * STABILITY_THRESHOLD of 0.3. See the residual note on
 * `deriveInitialDissipation` for what that costs.
 */
export const DERIVE_D_INTERCEPT = 0.2;
export const DERIVE_UNCERTAINTY_WEIGHT = 0.4;
export const DERIVE_FAILED_CHECK_WEIGHT = 0.06;

export const DERIVE_C_INTERCEPT = 0.15;
export const DERIVE_UNRESOLVED_CLAIM_WEIGHT = 0.04;
export const DERIVE_CONTRADICTION_WEIGHT = 0.25;

/**
 * Deterministic mapping from observable task-state signals to an initial
 * dissipation state for the solver to search from. Higher uncertainty and more
 * failed checks raise D (dissipation); unresolved claims and detected
 * contradictions raise C. Authored constants, not measured.
 *
 * ## Why these weights
 *
 * An earlier calibration used 0.1 per failed check and 0.08 per unresolved
 * claim. Swept across the signal grid (uncertainty 0..1 step 0.05 ×
 * failedChecks 0..8 × unresolvedClaims 0..10 × contradiction, 4158
 * combinations) and classified with the real `classifyAttractor`, that sent
 * 2509 of them — 60.3% — to ∅, which carries an attractor penalty of 1.0
 * against S*'s 0.3. The most consequential number in the output turned on how
 * many sentences a reader chose to call "unresolved".
 *
 * The current weights give `J=0 5 / S* 3273 / ∅ 880` — ∅ at 21.2%. Two
 * properties justify these particular numbers rather than merely describing
 * their effect, and `tests/kernel/derive.test.ts` asserts both:
 *
 *  1. Maximum reachable C is 0.80 (10 claims plus a contradiction) against a
 *     VOID_C_THRESHOLD of 0.90. The C axis therefore can never declare ∅ on
 *     its own, with 0.10 of margin — which also keeps it clear of the float
 *     boundary that makes a threshold comparison unreliable. Collapse becomes
 *     a D-axis verdict: unresolved claims agitate, only demonstrated failure
 *     collapses.
 *  2. Every combination that does reach ∅ carries at least 4 failed checks.
 *
 * ## Known residual
 *
 * J=0 remains reachable by only 5 of 4158 combinations. That is the
 * intercepts, not the weights: the floor sits at V = 0.26 against a 0.3
 * threshold, leaving 0.04 of headroom. A *derived initial* label is therefore
 * effectively never J=0, which is defensible — someone who states an intent
 * has by definition something unsettled — and harmless, because the common
 * S*→J=0 and ∅→J=0 arcs are both mapped in the transition table. Do not lower
 * the intercepts to improve this number without re-running the sweep; it would
 * move every band under every caller.
 */
export function deriveInitialDissipation(signals: IntentSignals): DissipationState {
  return {
    D: clamp01(
      DERIVE_D_INTERCEPT +
        signals.uncertainty * DERIVE_UNCERTAINTY_WEIGHT +
        signals.failedChecks.length * DERIVE_FAILED_CHECK_WEIGHT,
    ),
    C: clamp01(
      DERIVE_C_INTERCEPT +
        signals.unresolvedClaims.length * DERIVE_UNRESOLVED_CLAIM_WEIGHT +
        (signals.contradictionDetected ? DERIVE_CONTRADICTION_WEIGHT : 0),
    ),
  };
}

/**
 * Fixed target attractor for sequencing: a low-D, low-C stable ("J=0")
 * dissipation state. `planTask()` always searches from the task's current
 * dissipation state toward this target; the initial state carries the
 * task-specific signal (see `deriveInitialDissipation`), the target does not.
 *
 * It lives beside the formula so an intent-derived arc and an engine-planned
 * one aim at the same point instead of quietly disagreeing.
 */
export const STABLE_TARGET_DISSIPATION: DissipationState = { D: 0.1, C: 0.1 };
