import { describe, expect, it } from "vitest";
import { ALGEBRA_TOOLS, DERIVE_TOOLS, deriveInitialStateInput } from "../../src/mcp/tools.js";
import { DISTANCE_THRESHOLD, STABLE_TARGET_DISSIPATION } from "../../src/kernel/index.js";

/**
 * The tools are driven directly rather than over stdio. Each obligation below
 * is a property of the tool, not of the transport, and a test that had to speak
 * JSON-RPC to reach it would be testing the SDK.
 */

function tool(name: string) {
  const found = DERIVE_TOOLS.find((t) => t.name === name);
  if (!found) throw new Error(`no such tool: ${name}`);
  return found;
}

function call(name: string, args: unknown): any {
  const t = tool(name);
  return t.handler(t.inputSchema.parse(args) as never);
}

describe("the tool surface", () => {
  it("exposes exactly the four derive tools", () => {
    expect(DERIVE_TOOLS.map((t) => t.name)).toEqual([
      "derive_initial_state",
      "plan_arc",
      "numbers_for_label",
      "verify_arc",
    ]);
  });
});

describe("the chain-reading tool surface", () => {
  // Its own array again: this one implements no pseudocode document, it reads
  // formalism.json's algebra_relations.
  it("exposes exactly the one reading tool", () => {
    expect(ALGEBRA_TOOLS.map((t) => t.name)).toEqual(["read_chain_algebra"]);
  });

  function read(args: unknown): any {
    const t = ALGEBRA_TOOLS[0]!;
    return t.handler(t.inputSchema.parse(args) as never);
  }

  it("returns the stated relations for adjacent pairs, under the caveat", () => {
    const out = read({ chain: ["Meta", "Ortho", "Kata"] });
    expect(out.pairs[0].relations[0].statement).toBe("Meta ∘ Ortho = Retro");
    expect(out.caveat).toContain("none of them rewrites");
  });

  /**
   * The composer rejects an illegal chain because it is about to emit a brief
   * built from it. A reading emits nothing to act on, so it reports instead —
   * refusing to describe a chain would leave the caller with less than it
   * arrived with.
   */
  it("reads a chain the composer would reject, and reports the violation", () => {
    const out = read({ chain: ["Axis", "Ana"] });
    expect(out.violations.map((v: { constraint: string }) => v.constraint)).toEqual(["end-on-ana"]);
  });

  it("rejects an operator outside the alphabet", () => {
    const t = ALGEBRA_TOOLS[0]!;
    expect(t.inputSchema.safeParse({ chain: ["Meta", "Nope"] }).success).toBe(false);
  });
});

describe("derive_initial_state accepts signals and never numbers", () => {
  // The rule the whole derivation path exists to enforce. If this ever passes
  // a (D, C) pair through, an invented measurement reaches the solver wearing
  // the authority of a derived one.
  it("rejects a bare (D, C) payload", () => {
    expect(deriveInitialStateInput.safeParse({ D: 0.85, C: 0.75 }).success).toBe(false);
  });

  it("rejects a (D, C) pair smuggled in alongside valid signals", () => {
    // Not merely ignored — rejected. A stripped-and-accepted payload would let
    // a caller believe its numbers were honoured.
    const result = deriveInitialStateInput.safeParse({
      uncertainty: 0.6,
      failedChecks: [],
      unresolvedClaims: [],
      contradictionDetected: false,
      D: 0.85,
      C: 0.75,
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("unrecognized_keys");
  });

  it("derives a state and its label from signals alone", () => {
    const out = call("derive_initial_state", {
      uncertainty: 0.6,
      failedChecks: ["build fails"],
      unresolvedClaims: ["is the parser reentrant"],
      contradictionDetected: true,
    });
    expect(out.initial).toEqual({ D: 0.5, C: 0.44 });
    expect(out.initialLabel).toBe("S*");
    // Counts are echoed back so a reviewer can see what reading produced them.
    expect(out.signalsRead.failedChecks).toBe(1);
  });
});

describe("plan_arc reports findings rather than manufacturing work", () => {
  it("defaults to the engine's standing target when no label is stated", () => {
    const out = call("plan_arc", { initial: { D: 0.5, C: 0.44 } });
    expect(out.targetWasDefaulted).toBe(true);
    expect(out.target).toEqual(STABLE_TARGET_DISSIPATION);
    expect(out.targetLabel).toBe("J=0");
    expect(out.suggested.length).toBeGreaterThan(0);
    expect(out.sameLabel).toBe(false);
  });

  it("reports a same-label arc instead of re-rolling the target", () => {
    // S* -> S* is one of the three unmapped pairs. The answer is the finding
    // "you are already there", not a different target chosen to look busy.
    const out = call("plan_arc", { initial: { D: 0.5, C: 0.44 }, targetLabel: "S*" });
    expect(out.sameLabel).toBe(true);
    expect(out.suggested).toEqual([]);
    expect(out.targetLabel).toBe("S*");
  });

  it("flags an arc toward the costlier attractor without refusing it", () => {
    // A flag, not a rejection: some intents genuinely want more agitation.
    const out = call("plan_arc", { initial: { D: 0.1, C: 0.1 }, targetLabel: "∅" });
    expect(out.towardCostlierAttractor).toBe(true);
    expect(out.target.D).toBeGreaterThan(0.8);
  });

  it("does not flag the ordinary descent toward stability", () => {
    const out = call("plan_arc", { initial: { D: 0.9, C: 0.5 }, targetLabel: "J=0" });
    expect(out.towardCostlierAttractor).toBe(false);
  });
});

describe("numbers_for_label", () => {
  it("returns a point that actually classifies as the label asked for", () => {
    for (const label of ["J=0", "S*", "∅"] as const) {
      const out = call("numbers_for_label", { label });
      expect(out.classifiesAs).toBe(label);
    }
  });

  it("uses the engine's standing target as the stable representative", () => {
    // So an intent-derived arc and an engine-planned one aim at one point.
    expect(call("numbers_for_label", { label: "J=0" }).state).toEqual(STABLE_TARGET_DISSIPATION);
  });
});

describe("verify_arc distinguishes an empty plan from a solved one", () => {
  it("marks a state already inside the success radius", () => {
    // The document's own worked case: 0.0583 from the stable target, which the
    // solver answers with SUCCESS and an EMPTY sequence. A caller reading only
    // `success` would announce a solved plan where the truth is nothing to do.
    const out = call("verify_arc", {
      initial: { D: 0.15, C: 0.13 },
      target: STABLE_TARGET_DISSIPATION,
    });
    expect(out.success).toBe(true);
    expect(out.sequence).toEqual([]);
    expect(out.alreadyWithinRadius).toBe(true);
    expect(out.distance).toBeLessThanOrEqual(DISTANCE_THRESHOLD);
  });

  it("does not mark a real plan as already-arrived", () => {
    const out = call("verify_arc", {
      initial: { D: 0.85, C: 0.75 },
      target: STABLE_TARGET_DISSIPATION,
    });
    expect(out.alreadyWithinRadius).toBe(false);
    expect(out.sequence.length).toBeGreaterThan(0);
    expect(out.partial).toBe(!out.success);
  });

  it("rejects a label claim the kernel disagrees with", () => {
    // Nothing is presented to a user as a label until this passes.
    expect(() =>
      call("verify_arc", {
        initial: { D: 0.85, C: 0.75 },
        target: STABLE_TARGET_DISSIPATION,
        initialLabel: "J=0",
      }),
    ).toThrow(/classifies as ∅, not the claimed J=0/);
  });

  it("accepts a label claim the kernel agrees with", () => {
    const out = call("verify_arc", {
      initial: { D: 0.85, C: 0.75 },
      target: STABLE_TARGET_DISSIPATION,
      initialLabel: "∅",
      targetLabel: "J=0",
    });
    expect(out.initialLabel).toBe("∅");
  });

  it("flags a diagnosis operator the solver never reaches for", () => {
    // The shipped `stuck` template is the live instance: it names Meta, and the
    // solver returns a sequence without one. It describes the cause, not the
    // cure — so this is a flag and must never drive a rewrite.
    const out = call("verify_arc", {
      initial: { D: 0.85, C: 0.75 },
      target: { D: 0.3, C: 0.35 },
      diagnosis: "Meta ∘ Meta loop (infinite reflection)",
    });
    expect(out.sequence).not.toContain("Meta");
    expect(out.unusedDiagnosisOperators).toEqual(["Meta"]);
  });

  it("flags nothing when the diagnosis names operators the solver uses", () => {
    const solved = call("verify_arc", {
      initial: { D: 0.85, C: 0.75 },
      target: { D: 0.3, C: 0.35 },
    });
    const out = call("verify_arc", {
      initial: { D: 0.85, C: 0.75 },
      target: { D: 0.3, C: 0.35 },
      diagnosis: `needs ${solved.sequence[0]}`,
    });
    expect(out.unusedDiagnosisOperators).toEqual([]);
  });
});
