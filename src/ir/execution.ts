/**
 * Compiles an operator sequence into a cognitive execution program.
 *
 * This is the translation layer between `solve()`/`legalNext` output and the
 * instructions an agent actually runs. The design rule is that the kernel
 * authors every field it can compute, and a model may fill only the three
 * domain-binding slots (see `instructionBindingSchema` in
 * src/adapters/schemas.ts). A model therefore *applies* vocabulary it is
 * forbidden from *inventing* — which is the failure mode when an agent is
 * handed a bare sequence and asked to "write instructions from the meanings".
 *
 * Proposed in docs/suggestions/operator-sequence-to-execution-language.md
 * (§1 instruction frame, §5 normalization, §7 provenance).
 */

import type { LambdaBand, Operator, OperatorClass } from "../kernel/index.js";
import {
  lambdaEffective,
  lambdaIntrinsic,
  operatorClass,
  operatorMeaning,
  operatorSymbol,
} from "../kernel/index.js";
import { checkForbiddenSequence } from "../vocab/grammar.js";
import {
  budgetForBand,
  executionMode,
  type Capability,
  type ExecutionBudget,
} from "../vocab/execution-classes.js";
import { instructionBindingSchema, type InstructionBinding } from "../adapters/schemas.js";
import { lambdaBandFor } from "./compile.js";
import { normalizeSequence, type AlphabetCoverage, type OperatorRun } from "./normalize.js";

export const EXECUTION_CONSTRAINT =
  "execute these instructions in order; do not invent operators, capabilities, or steps outside this program";

/**
 * Provenance of a model-authored binding. Deliberately narrowed to "inferred":
 * this engine only ever emits `authored` kernel values, and a model's reading
 * of human intent is not a measurement. See docs/VOCABULARY.md, and note that
 * `record`/`validate`/`score` are intentionally unimplemented.
 */
export type BindingProvenance = "inferred";

export interface CognitiveInstruction {
  readonly index: number;

  // --- kernel-computed from src/assets/formalism.json; a model must not alter these ---
  readonly op: Operator;
  readonly symbol: string;
  readonly className: OperatorClass;
  readonly lambda: number;
  readonly meaning: string;
  /** Collapsed repetitions; read as intensity, not as N distinct acts. */
  readonly iterations: number;
  readonly sourceIndices: readonly number[];
  readonly cognitiveMove: string;
  readonly capabilities: readonly Capability[];
  readonly requiredArtifact: string;
  readonly budget: ExecutionBudget;

  // --- model-authored, schema-constrained, null until bound ---
  readonly binding: InstructionBinding | null;
  readonly bindingProvenance: BindingProvenance;
}

export interface ExecutionProgram {
  /** The raw sequence, retained so a trace keeps its subject after collapse. */
  readonly sequence: readonly Operator[];
  readonly instructions: readonly CognitiveInstruction[];
  readonly lambdaEffective: number;
  readonly programBand: LambdaBand;
  readonly programBudget: ExecutionBudget;
  readonly coverage: AlphabetCoverage;
  readonly notes: readonly string[];
  /** True only once every instruction carries a validated binding. */
  readonly bound: boolean;
  readonly constraint: string;
}

function instructionFor(run: OperatorRun, index: number): CognitiveInstruction {
  const mode = executionMode(run.op);
  const lambda = lambdaIntrinsic(run.op);
  return {
    index,
    op: run.op,
    symbol: operatorSymbol(run.op),
    className: operatorClass(run.op),
    lambda,
    meaning: operatorMeaning(run.op),
    iterations: run.iterations,
    sourceIndices: run.sourceIndices,
    cognitiveMove: mode.cognitiveMove,
    capabilities: mode.capabilities,
    requiredArtifact: mode.requiredArtifact,
    budget: budgetForBand(lambdaBandFor(lambda)),
    binding: null,
    bindingProvenance: "inferred",
  };
}

/**
 * Compile a sequence into an unbound execution program.
 *
 * Rejects rather than repairs: a sequence that fails the sequence grammar is
 * an error, not something to quietly rewrite into something legal. The caller's
 * legal moves are to re-solve with different endpoints or to escalate to
 * HALIRA Mode 2 — see the suggestion doc §8.
 */
export function compileExecutionProgram(sequence: readonly Operator[]): ExecutionProgram {
  const verdict = checkForbiddenSequence(sequence);
  if (!verdict.accepted) {
    throw new Error(`cannot compile: ${verdict.reason} [${verdict.constraint}]`);
  }

  const normalized = normalizeSequence(sequence);
  const lambda = lambdaEffective(sequence);
  const band = lambdaBandFor(lambda);

  return {
    sequence,
    instructions: normalized.runs.map(instructionFor),
    lambdaEffective: lambda,
    programBand: band,
    programBudget: budgetForBand(band),
    coverage: normalized.coverage,
    notes: normalized.notes,
    bound: false,
    constraint: EXECUTION_CONSTRAINT,
  };
}

/**
 * The per-instruction request a translator model answers. This is what gets
 * sent to the model — never the free-form sequence — so the model's entire
 * output surface is three fields per instruction.
 */
export interface BindingRequest {
  readonly index: number;
  readonly op: Operator;
  readonly meaning: string;
  readonly cognitiveMove: string;
  readonly requiredArtifact: string;
}

export function bindingRequests(program: ExecutionProgram): readonly BindingRequest[] {
  return program.instructions.map((instruction) => ({
    index: instruction.index,
    op: instruction.op,
    meaning: instruction.meaning,
    cognitiveMove: instruction.cognitiveMove,
    requiredArtifact: instruction.requiredArtifact,
  }));
}

/**
 * Attach validated model-authored bindings, keyed by instruction index.
 *
 * Fails closed: an unknown index, or a binding that does not satisfy
 * `instructionBindingSchema` (including the "must cite at least one evidence
 * span" rule), throws instead of being partially applied. Returns a new
 * program; the input is never mutated.
 */
export function bindExecutionProgram(
  program: ExecutionProgram,
  bindings: Readonly<Record<string, unknown>>,
): ExecutionProgram {
  const validIndices = new Set(program.instructions.map((instruction) => String(instruction.index)));
  for (const key of Object.keys(bindings)) {
    if (!validIndices.has(key)) {
      throw new Error(
        `binding for unknown instruction index "${key}" (program has ${program.instructions.length})`,
      );
    }
  }

  const instructions = program.instructions.map((instruction) => {
    const raw = bindings[String(instruction.index)];
    if (raw === undefined) return instruction;

    const parsed = instructionBindingSchema.safeParse(raw);
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ");
      throw new Error(`invalid binding for instruction ${instruction.index}: ${detail}`);
    }
    return { ...instruction, binding: parsed.data };
  });

  return {
    ...program,
    instructions,
    bound: instructions.every((instruction) => instruction.binding !== null),
  };
}

export function renderExecutionProgramMarkdown(program: ExecutionProgram): string {
  const lines: string[] = [];

  lines.push("# Execution program");
  lines.push("");
  lines.push(`- sequence: ${program.sequence.join(" ∘ ")}`);
  lines.push(
    `- λ_eff: ${program.lambdaEffective.toFixed(3)} (**${program.programBand}** band) — ` +
      `fan-out ${program.programBudget.fanOut}, verify ${program.programBudget.verify}, ` +
      `tier ${program.programBudget.modelTier}`,
  );
  lines.push(
    `- alphabet coverage: ${program.coverage.distinctOperators}/${program.coverage.length} ` +
      `(${program.coverage.ratio.toFixed(2)})${program.coverage.degenerate ? " — **degenerate**" : ""}`,
  );
  lines.push(`- bound: ${program.bound ? "yes" : "no (domain bindings missing)"}`);

  if (program.notes.length > 0) {
    lines.push("");
    lines.push("## Normalization notes");
    for (const note of program.notes) lines.push(`- ${note}`);
  }

  lines.push("");
  lines.push("## Instructions");
  for (const instruction of program.instructions) {
    const repeat = instruction.iterations > 1 ? ` ×${instruction.iterations}` : "";
    lines.push("");
    lines.push(
      `### ${instruction.index}. ${instruction.symbol} ${instruction.op}${repeat} — ${instruction.meaning}`,
    );
    lines.push(`- class: ${instruction.className} — ${instruction.cognitiveMove}`);
    lines.push(`- capabilities: ${instruction.capabilities.join(", ")}`);
    lines.push(
      `- budget: λ=${instruction.lambda} (${instruction.budget.band}) — ` +
        `fan-out ${instruction.budget.fanOut}, verify ${instruction.budget.verify}, ` +
        `tier ${instruction.budget.modelTier}`,
    );
    lines.push(`- must produce: ${instruction.requiredArtifact}`);
    if (instruction.binding) {
      lines.push(
        `- binding (${instruction.bindingProvenance}): ${instruction.binding.domainBinding}`,
      );
      lines.push(`- evidence: ${instruction.binding.evidenceRefs.map((ref) => ref.id).join(", ")}`);
      lines.push(`- exit test: ${instruction.binding.exitTest}`);
    } else {
      lines.push(
        "- binding: _(unbound — translator must supply domainBinding/evidenceRefs/exitTest)_",
      );
    }
  }

  lines.push("");
  lines.push(`> Hard rule: ${program.constraint}`);
  return lines.join("\n");
}
