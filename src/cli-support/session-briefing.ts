import { operatorMeaning, type Session } from "../kernel/index.js";
import { AttractorVocabulary } from "../vocab/attractors.js";
import { statusPayload } from "./status-payload.js";
import { pickPolicyOperator } from "./suggest-operator.js";

/**
 * The current session, said in the few lines a host can afford to prepend to
 * every turn.
 *
 * This is what `lambda inject` emits. It composes `statusPayload` and the
 * formalism's own prose — it authors no operator vocabulary of its own, which
 * is the whole point: an engine that restated what an operator means would be
 * a second source of truth competing with `formalism.json`.
 *
 * Deliberately terse. `legalNext` is listed by name only, and only the
 * suggested operator carries its meaning: in Mode 1 the legal set is up to
 * twenty operators, and twenty glosses prepended to every prompt is context
 * pollution rather than guidance. The full reading is a command away
 * (`lambda status --json`, `lambda ir`).
 */
export class SessionBriefing {
  /** The briefing as lines, for a caller that wants to join them its own way. */
  static lines(session: Session): readonly string[] {
    const payload = statusPayload(session);
    const applied = session.sequence.length > 0 ? session.sequence.join(" → ") : "(none yet)";

    if (payload.bound) {
      return [
        `RecursivePraxis session: bound — ${applied}.`,
        "No further `lambda step` calls are legal. Start a new arc to continue.",
      ];
    }

    const mode =
      payload.mode === 2
        ? `mode 2 (HALIRA recovery, step ${payload.haliraStep})`
        : "mode 1";

    const lines = [
      `RecursivePraxis session: ${mode}, applied: ${applied}`,
      `attractor ${AttractorVocabulary.gloss(payload.attractor)}`,
      `λ_eff ${payload.lambdaEffective.toFixed(3)} (${payload.lambdaBand})`,
    ];

    const escape = AttractorVocabulary.escapeAdvice(payload.attractor);
    if (escape !== undefined) lines.push(escape);

    if (payload.legalNext.length === 0) {
      lines.push("legal next: (none) — call `lambda bind`, or escalate with `lambda halira start`.");
      return lines;
    }

    lines.push(`legal next: ${payload.legalNext.map((entry) => entry.op).join(", ")}`);
    const suggested = pickPolicyOperator(session);
    lines.push(`suggested: ${suggested} — ${operatorMeaning(suggested)}`);
    lines.push("Advance with `lambda step --op <Op>`; finalize with `lambda bind`.");
    return lines;
  }

  /** The briefing as one string, which is how a hook payload carries it. */
  static text(session: Session): string {
    return SessionBriefing.lines(session).join("\n");
  }
}
