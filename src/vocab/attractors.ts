/**
 * How an attractor label is said, for a reader who has only the glyph.
 *
 * Sits beside `prompt-policy.ts` and for the same reason: the formalism states
 * the values (`phase_portrait.attractors`), and this file is how
 * RecursivePraxis chooses to phrase them. Nothing here decides anything — the
 * label a state carries is `classifyAttractor`'s answer, and this only puts
 * words to it.
 *
 * Unlike the adjective table next door, no wording here is authored: every
 * string is the formalism's own, composed rather than translated. The judgment
 * is in what to show and when, not in what the attractor means.
 */

import { attractorProfile, type AttractorLabel, type AttractorProfile } from "../kernel/index.js";

export class AttractorVocabulary {
  /** One line: the glyph, the formalism's name for it, and what it is like. */
  static gloss(label: AttractorLabel): string {
    const profile = attractorProfile(label);
    return `${label} ${profile.name} — ${profile.characteristics}`;
  }

  /**
   * The way out, where the formalism states one. Only the collapse attractor
   * does: a trajectory that has fallen into it needs to be told what to do,
   * and "requires rescue" on its own is not that.
   */
  static escapeAdvice(label: AttractorLabel): string | undefined {
    const { escapeRequires } = attractorProfile(label);
    if (escapeRequires === undefined || escapeRequires.length === 0) return undefined;
    return `escaping it requires ${escapeRequires.join(", ")}`;
  }

  /** The fuller reading, for a report that has room for it. */
  static describe(label: AttractorLabel): readonly string[] {
    const profile = attractorProfile(label);
    const lines = [
      `${label} ${profile.name}`,
      `  ${profile.description}`,
      `  basin: ${profile.basin}`,
      `  reached by: ${profile.reachedBy.join(", ")}`,
    ];
    const escape = AttractorVocabulary.escapeAdvice(label);
    if (escape !== undefined) lines.push(`  ${escape}`);
    return lines;
  }

  /** The profile itself, for `--json` consumers that want the fields. */
  static profile(label: AttractorLabel): AttractorProfile {
    return attractorProfile(label);
  }
}
