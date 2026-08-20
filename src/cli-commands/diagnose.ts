import { classifyAttractor, solve } from "../kernel/index.js";

/** Ported from the quarry's controlled_rupture_cli.py `problem_templates`. */
const PROBLEM_TEMPLATES = {
  stuck: {
    description: "Stuck in infinite loop / analysis paralysis",
    initial: { D: 0.85, C: 0.75 },
    target: { D: 0.3, C: 0.35 },
    diagnosis: "Meta ∘ Meta loop (infinite reflection)",
  },
  overwhelmed: {
    description: "Overwhelmed by complexity",
    initial: { D: 0.8, C: 0.8 },
    target: { D: 0.2, C: 0.15 },
    diagnosis: "Excessive Ana without Kata (no compression)",
  },
  rigid: {
    description: "Too rigid / overthinking correctness",
    initial: { D: 0.15, C: 0.1 },
    target: { D: 0.5, C: 0.5 },
    diagnosis: "Excessive Ortho (over-correction)",
  },
  collapsed: {
    description: "Burned out / collapsed",
    initial: { D: 0.95, C: 0.9 },
    target: { D: 0.4, C: 0.45 },
    diagnosis: "In the Void (∅), need rescue operators",
  },
  procrastinating: {
    description: "Procrastinating / avoiding action",
    initial: { D: 0.6, C: 0.5 },
    target: { D: 0.25, C: 0.2 },
    diagnosis: "Need Telo (goal orientation) + Kata (concrete action)",
  },
} as const;

type ProblemKey = keyof typeof PROBLEM_TEMPLATES;

export function runDiagnose(problemArg: string, json: boolean): void {
  const key = problemArg as ProblemKey;
  const problem = PROBLEM_TEMPLATES[key];
  if (!problem) {
    console.error(`unknown problem "${problemArg}". Available: ${Object.keys(PROBLEM_TEMPLATES).join(", ")}`);
    process.exit(1);
  }

  const initialAttractor = classifyAttractor(problem.initial.D, problem.initial.C);
  const targetAttractor = classifyAttractor(problem.target.D, problem.target.C);
  const solution = solve({ initial: problem.initial, target: problem.target, beamWidth: 10 });

  if (json) {
    console.log(JSON.stringify({ problem, initialAttractor, targetAttractor, solution }, null, 2));
    process.exit(0);
  }

  console.log(`problem: ${problem.description}`);
  console.log(`diagnosis: ${problem.diagnosis}`);
  console.log(`${initialAttractor} -> ${targetAttractor}`);
  console.log("");
  console.log(solution.success ? "SUCCESS" : "PARTIAL");
  console.log(`sequence: ${solution.sequence.join(" ∘ ") || "(empty)"}`);
  process.exit(0);
}

export function listDiagnoseProblems(json: boolean): void {
  if (json) {
    console.log(
      JSON.stringify(
        Object.entries(PROBLEM_TEMPLATES).map(([key, p]) => ({ key, description: p.description })),
        null,
        2,
      ),
    );
    process.exit(0);
  }
  for (const [key, p] of Object.entries(PROBLEM_TEMPLATES)) {
    console.log(`${key.padEnd(16)} ${p.description}`);
  }
  process.exit(0);
}
