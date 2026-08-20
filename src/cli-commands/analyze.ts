import { analyzeSequence, simulateTrajectory, type Operator, type TrajectoryStep } from "../kernel/index.js";
import { parseOperatorSequence } from "../cli-support/parse.js";

// S*, matching the quarry's controlled_rupture_cli.py analyze_sequence default.
const SIMULATION_START = { D: 0.5, C: 0.5 };

function checkWarnings(sequence: readonly Operator[], trajectory: readonly TrajectoryStep[]): string[] {
  const warnings: string[] = [];

  const metaCount = sequence.filter((op) => op === "Meta").length;
  if (metaCount > 2) {
    warnings.push(`${metaCount} Meta operators in sequence (collapse risk)`);
  }
  if (trajectory.some((step) => step.attractor === "void")) {
    warnings.push("trajectory enters void — requires rescue");
  }
  for (let i = 0; i < sequence.length - 1; i += 1) {
    if (sequence[i] === "Meta" && sequence[i + 1] === "Non") {
      warnings.push(`step ${i}: Meta -> Non (forbidden transition)`);
    }
    if (sequence[i] === "Non" && sequence[i + 1] === "Para") {
      warnings.push(`step ${i}: Non -> Para (forbidden transition)`);
    }
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

  if (json) {
    console.log(JSON.stringify({ ...analysis, trajectory, warnings }, null, 2));
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
  if (warnings.length > 0) {
    console.log("");
    console.log("warnings:");
    for (const warning of warnings) console.log(`  - ${warning}`);
  }
  process.exit(0);
}
