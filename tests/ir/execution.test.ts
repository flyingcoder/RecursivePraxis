import { describe, expect, it } from "vitest";
import type { Operator } from "../../src/kernel/types.js";
import {
  bindExecutionProgram,
  bindingRequests,
  compileExecutionProgram,
  renderExecutionProgramMarkdown,
} from "../../src/ir/execution.js";
import { normalizeSequence } from "../../src/ir/normalize.js";
import { parseOperatorSequence } from "../../src/cli-support/parse.js";

/**
 * The worked example from
 * docs/suggestions/operator-sequence-to-execution-language.md §9 — the
 * deployment-pipeline intent whose stated goals contradict each other.
 */
const EXAMPLE: readonly Operator[] = [
  "Axis",
  "Crux",
  "Ana",
  "Meta",
  "Para",
  "Weave",
  "Kata",
  "Bind",
];

/** Verbatim `lambda solve --initial 0.9,0.1 --target 0.3,0.7` output. */
const SOLVER_TRAJECTORY: readonly Operator[] = [
  "Telo",
  "Telo",
  "Telo",
  "Telo",
  "Telo",
  "Para",
  "Crux",
  "Crux",
  "Crux",
  "Telo",
  "Para",
  "Crux",
];

const SYNTHETIC_HASH = "0".repeat(64);

function binding(text: string) {
  return {
    domainBinding: text,
    evidenceRefs: [{ id: "span:2", kind: "input", hash: SYNTHETIC_HASH }],
    exitTest: "a falsifiable check that this step happened",
  };
}

describe("compileExecutionProgram — the §9 example sequence", () => {
  it("compiles one instruction per operator when nothing repeats", () => {
    const program = compileExecutionProgram(EXAMPLE);
    expect(program.instructions).toHaveLength(EXAMPLE.length);
    expect(program.instructions.map((i) => i.op)).toEqual([...EXAMPLE]);
    expect(program.notes).toEqual([]);
  });

  it("carries the kernel's λ_eff and band for the whole program", () => {
    const program = compileExecutionProgram(EXAMPLE);
    expect(program.lambdaEffective).toBeCloseTo(0.654, 3);
    expect(program.programBand).toBe("mid");
    expect(program.programBudget).toEqual({
      band: "mid",
      fanOut: 3,
      verify: "single",
      modelTier: "standard",
    });
  });

  it("takes operator meaning verbatim from the formalism, never paraphrased", () => {
    const program = compileExecutionProgram(EXAMPLE);
    const crux = program.instructions.find((i) => i.op === "Crux");
    expect(crux?.meaning).toBe("Core pivot, hinge");
    expect(crux?.symbol).toBe("⊗");
    expect(crux?.lambda).toBe(0.42);
  });

  it("starts unbound, with every binding slot empty and marked inferred", () => {
    const program = compileExecutionProgram(EXAMPLE);
    expect(program.bound).toBe(false);
    for (const instruction of program.instructions) {
      expect(instruction.binding).toBeNull();
      expect(instruction.bindingProvenance).toBe("inferred");
    }
  });

  it("reports full alphabet coverage for a hand-picked sequence", () => {
    const program = compileExecutionProgram(EXAMPLE);
    expect(program.coverage.distinctOperators).toBe(8);
    expect(program.coverage.ratio).toBe(1);
    expect(program.coverage.degenerate).toBe(false);
  });
});

describe("capability schedule (§2)", () => {
  it("denies write to disruptive steps and grants it to structural ones", () => {
    const program = compileExecutionProgram(EXAMPLE);
    const byOp = new Map(program.instructions.map((i) => [i.op, i]));

    // Ana and Para attack the current framing — they must not be able to commit one.
    expect(byOp.get("Ana")?.capabilities).toEqual(["read"]);
    expect(byOp.get("Para")?.capabilities).toEqual(["read"]);
    // Meta inspects the run's own prior output.
    expect(byOp.get("Meta")?.capabilities).toEqual(["read"]);
    // Structural and constructive steps may write.
    expect(byOp.get("Bind")?.capabilities).toEqual(["read", "write"]);
    expect(byOp.get("Kata")?.capabilities).toEqual(["read", "write"]);
  });

  it("grants shell and network to no operator class", () => {
    const program = compileExecutionProgram(EXAMPLE);
    for (const instruction of program.instructions) {
      expect(instruction.capabilities).not.toContain("shell");
      expect(instruction.capabilities).not.toContain("network");
    }
  });
});

describe("execution budget (§3)", () => {
  it("buys fan-out and adversarial verification for high-λ operators", () => {
    const program = compileExecutionProgram(EXAMPLE);
    const meta = program.instructions.find((i) => i.op === "Meta");
    expect(meta?.lambda).toBe(0.8);
    expect(meta?.budget).toEqual({
      band: "high",
      fanOut: 5,
      verify: "adversarial",
      modelTier: "strongest",
    });
  });

  it("runs low-λ stabilizers as a single cheap pass", () => {
    const program = compileExecutionProgram(["Axis", "Kata", "Latch"]);
    for (const instruction of program.instructions) {
      expect(instruction.budget.band).toBe("low");
      expect(instruction.budget.fanOut).toBe(1);
      expect(instruction.budget.modelTier).toBe("cheap");
    }
  });
});

describe("normalization of raw solver output (§5)", () => {
  it("collapses runs into one instruction carrying an iteration count", () => {
    const program = compileExecutionProgram(SOLVER_TRAJECTORY);
    expect(SOLVER_TRAJECTORY).toHaveLength(12);
    expect(program.instructions).toHaveLength(6);

    const first = program.instructions[0]!;
    expect(first.op).toBe("Telo");
    expect(first.iterations).toBe(5);
    expect(first.sourceIndices).toEqual([0, 1, 2, 3, 4]);
  });

  it("flags a degenerate trajectory instead of laundering it into prose", () => {
    const program = compileExecutionProgram(SOLVER_TRAJECTORY);
    expect(program.coverage.distinctOperators).toBe(3);
    expect(program.coverage.degenerate).toBe(true);
    expect(program.notes.some((note) => note.includes("low alphabet coverage"))).toBe(true);
  });

  it("retains the raw sequence so replay keeps its subject", () => {
    const program = compileExecutionProgram(SOLVER_TRAJECTORY);
    expect(program.sequence).toEqual(SOLVER_TRAJECTORY);
  });

  it("leaves a short repeating sequence unflagged", () => {
    const normalized = normalizeSequence(["Telo", "Telo"]);
    expect(normalized.coverage.degenerate).toBe(false);
    expect(normalized.runs).toHaveLength(1);
  });
});

describe("grammar rejection is not repaired (§8)", () => {
  it("refuses to compile a sequence ending on Ana", () => {
    expect(() => compileExecutionProgram(["Kata", "Ana"])).toThrow(/end-on-ana/);
  });

  it("refuses to compile a forbidden transition", () => {
    expect(() => compileExecutionProgram(["Meta", "Non", "Kata"])).toThrow(
      /non-immediately-after-meta/,
    );
  });

  it("refuses to compile an empty sequence", () => {
    expect(() => compileExecutionProgram([])).toThrow(/empty sequence/);
  });
});

describe("binding the model-authored slots (§1, §6)", () => {
  it("exposes one binding request per instruction and nothing more", () => {
    const program = compileExecutionProgram(EXAMPLE);
    const requests = bindingRequests(program);
    expect(requests).toHaveLength(EXAMPLE.length);
    expect(Object.keys(requests[0]!).sort()).toEqual([
      "cognitiveMove",
      "index",
      "meaning",
      "op",
      "requiredArtifact",
    ]);
  });

  it("rejects a binding that cites no evidence span", () => {
    const program = compileExecutionProgram(EXAMPLE);
    expect(() =>
      bindExecutionProgram(program, {
        "0": { domainBinding: "identify the key tension", evidenceRefs: [], exitTest: "check" },
      }),
    ).toThrow(/invalid binding for instruction 0/);
  });

  it("rejects a binding for an instruction index that does not exist", () => {
    const program = compileExecutionProgram(EXAMPLE);
    expect(() => bindExecutionProgram(program, { "99": binding("out of range") })).toThrow(
      /unknown instruction index "99"/,
    );
  });

  it("stays unbound while any instruction lacks a binding", () => {
    const program = compileExecutionProgram(EXAMPLE);
    const partial = bindExecutionProgram(program, { "0": binding("frame the delivery pipeline") });
    expect(partial.bound).toBe(false);
    expect(partial.instructions[0]?.binding?.domainBinding).toBe("frame the delivery pipeline");
    expect(partial.instructions[1]?.binding).toBeNull();
  });

  it("reports bound once every instruction carries a validated binding", () => {
    const program = compileExecutionProgram(EXAMPLE);
    const all = Object.fromEntries(
      program.instructions.map((instruction) => [
        String(instruction.index),
        binding(`bound ${instruction.op}`),
      ]),
    );
    expect(bindExecutionProgram(program, all).bound).toBe(true);
  });

  it("does not mutate the program it binds", () => {
    const program = compileExecutionProgram(EXAMPLE);
    bindExecutionProgram(program, { "0": binding("frame the delivery pipeline") });
    expect(program.instructions[0]?.binding).toBeNull();
    expect(program.bound).toBe(false);
  });
});

describe("rendering", () => {
  it("prints capabilities, budget, and the hard rule", () => {
    const markdown = renderExecutionProgramMarkdown(compileExecutionProgram(EXAMPLE));
    expect(markdown).toContain("⊗ Crux");
    expect(markdown).toContain("capabilities: read");
    expect(markdown).toContain("verify adversarial");
    expect(markdown).toContain("do not invent operators");
  });
});

/**
 * `parseOperatorSequence` is the entry point every caller of this compiler
 * goes through, and it had no covering tests before this prototype.
 */
describe("parseOperatorSequence", () => {
  it("accepts both the ∘ and , separators", () => {
    expect(parseOperatorSequence("Axis ∘ Crux ∘ Ana")).toEqual(["Axis", "Crux", "Ana"]);
    expect(parseOperatorSequence("Axis, Crux, Ana")).toEqual(["Axis", "Crux", "Ana"]);
  });

  it("resolves case to canonical operator spellings", () => {
    expect(parseOperatorSequence("axis,CRUX")).toEqual(["Axis", "Crux"]);
  });

  it("rejects an operator outside the alphabet", () => {
    expect(() => parseOperatorSequence("Axis,Sparkle")).toThrow(/not one of the 20 operators/);
  });
});
