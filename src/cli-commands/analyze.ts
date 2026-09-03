import {
  analyzeSequence,
  simulateTrajectory,
  type AttractorLabel,
  type Operator,
  type TrajectoryStep,
} from "../kernel/index.js";
import { parseOperatorSequence } from "../cli-support/parse.js";
import { ChainReading } from "../ir/chainReading.js";
import { AttractorVocabulary } from "../vocab/attractors.js";
import { sequenceViolations } from "../vocab/grammar.js";

// S*, matching the quarry's controlled_rupture_cli.py analyze_sequence default.
const SIMULATION_START = { D: 0.5, C: 0.5 };

/**
 * Grammar violations come from `sequenceViolations`, which is the same scan
 * `checkForbiddenSequence` gates on. This function used to re-implement the
 * Meta→Non and Non→Para pair checks against its own copy of the rules, so a
 * rule added to the kernel — Vale's stabilizer requirement, already shipped —
 * silently went unreported here.
 *
 * The two remaining checks are genuinely this command's own: neither is a hard
 * constraint. Total Meta count is a soft collapse signal (the hard rule is
 * about *consecutive* Meta), and entering the void is a property of the
 * simulated trajectory, not of the sequence grammar.
 */
function checkWarnings(sequence: readonly Operator[], trajectory: readonly TrajectoryStep[]): string[] {
  const warnings: string[] = [];

  const metaCount = sequence.filter((op) => op === "Meta").length;
  if (metaCount > 2) {
    warnings.push(`${metaCount} Meta operators in sequence (collapse risk)`);
  }
  if (trajectory.some((step) => step.attractor === "∅")) {
    // The formalism states the rescue (`escape_requires`), so the warning names
    // it rather than leaving the reader to know which operators climb out.
    const escape = AttractorVocabulary.escapeAdvice("∅");
    warnings.push(`trajectory enters void — requires rescue: ${escape ?? "no escape route is stated"}`);
  }
  for (const violation of sequenceViolations(sequence)) {
    warnings.push(`step ${violation.index} (${violation.operator}): ${violation.reason} [${violation.constraint}]`);
  }
  return warnings;
}

export function runAnalyze(sequenceArg: string, json: boolean): void {
  let sequence: Operator[];
  try {
    sequence = parseOperatorSequence(sequenceArg);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }

  const analysis = analyzeSequence(sequence);
  const trajectory = simulateTrajectory(SIMULATION_START, sequence);
  const warnings = checkWarnings(sequence, trajectory);
  const reading = ChainReading.read(sequence);
  // In visit order, so the legend reads down the trajectory above it.
  const visited = [...new Set(trajectory.map((step) => step.attractor))] as AttractorLabel[];

  if (json) {
    console.log(
      JSON.stringify(
        {
          ...analysis,
          trajectory,
          warnings,
          attractors: visited.map((label) => AttractorVocabulary.profile(label)),
          algebra: reading.summary(),
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  console.log(`sequence: ${sequence.join(" ∘ ")}`);
  console.log(
    `lambda_eff: ${analysis.lambdaEffective.toFixed(3)}  half_life: ${analysis.halfLife.toFixed(2)} steps`,
  );
  console.log("");
  console.log("trajectory (from S* D=0.5,C=0.5):");
  for (const step of trajectory.slice(1)) {
    console.log(`  ${step.operator} -> ${step.attractor} (D=${step.D.toFixed(2)}, C=${step.C.toFixed(2)})`);
  }
  console.log("");
  console.log("attractors visited:");
  for (const label of visited) {
    console.log(`  ${AttractorVocabulary.gloss(label)}`);
  }
  if (warnings.length > 0) {
    console.log("");
    console.log("warnings:");
    for (const warning of warnings) console.log(`  - ${warning}`);
  }

  const readingLines = reading.renderLines();
  if (readingLines.length > 0) {
    console.log("");
    for (const line of readingLines) console.log(line);
  }
  process.exit(0);
}
