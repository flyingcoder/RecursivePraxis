import { describe, expect, it } from "vitest";
import formalismData from "../../src/assets/formalism.json" with { type: "json" };
import { attractorProfile } from "../../src/kernel/formalism.js";
import { AttractorVocabulary } from "../../src/vocab/attractors.js";
import type { AttractorLabel } from "../../src/kernel/types.js";

const LABELS = ["J=0", "S*", "∅"] as const satisfies readonly AttractorLabel[];

const attractors = (
  formalismData as unknown as {
    phase_portrait: {
      attractors: Record<string, { name: string; characteristics: string; escape_requires?: string[] }>;
    };
  }
).phase_portrait.attractors;

describe("reading the phase portrait's prose", () => {
  it("profiles all three attractors, verbatim from the formalism", () => {
    expect(attractorProfile("J=0").name).toBe(attractors["J_equals_0"]!.name);
    expect(attractorProfile("S*").name).toBe(attractors["S_star"]!.name);
    expect(attractorProfile("∅").characteristics).toBe(attractors["void"]!.characteristics);
  });

  it("carries the label it was asked about, so a profile is self-describing", () => {
    for (const label of LABELS) {
      expect(attractorProfile(label).label).toBe(label);
    }
  });

  /**
   * `reached_by` is not a uniform kind in the source: `J=0` lists operators,
   * `S*` says "Ana + Pro + Para combinations". Kept as authored strings rather
   * than parsed into operators, because three of the entries are prose and
   * typing them as an operator list would claim something the file does not.
   */
  it("keeps reached_by as authored, prose entries included", () => {
    expect(attractorProfile("J=0").reachedBy).toEqual(["Kata", "Ortho", "Telo", "Latch"]);
    expect(attractorProfile("S*").reachedBy).toEqual(["Ana + Pro + Para combinations"]);
  });

  it("states an escape route only for the collapse attractor", () => {
    expect(attractorProfile("∅").escapeRequires).toEqual(["Telo", "Ortho", "Pro"]);
    expect(attractorProfile("J=0").escapeRequires).toBeUndefined();
    expect(attractorProfile("S*").escapeRequires).toBeUndefined();
  });
});

describe("saying an attractor", () => {
  it("glosses every label with its name and characteristics", () => {
    for (const label of LABELS) {
      const gloss = AttractorVocabulary.gloss(label);
      expect(gloss).toContain(label);
      expect(gloss).toContain(attractorProfile(label).name);
    }
  });

  /**
   * The gap this closed: `analyze` warned that a trajectory "requires rescue"
   * while `escape_requires` sat unread three lines away in the same file.
   */
  it("names the way out of the void, and offers none where none is stated", () => {
    expect(AttractorVocabulary.escapeAdvice("∅")).toBe("escaping it requires Telo, Ortho, Pro");
    expect(AttractorVocabulary.escapeAdvice("J=0")).toBeUndefined();
    expect(AttractorVocabulary.escapeAdvice("S*")).toBeUndefined();
  });

  it("describes an attractor over several lines, escape route last", () => {
    const lines = AttractorVocabulary.describe("∅");
    expect(lines[0]).toContain("Void (Collapse)");
    expect(lines.some((line) => line.includes("basin:"))).toBe(true);
    expect(lines[lines.length - 1]).toContain("escaping it requires");
  });
});
