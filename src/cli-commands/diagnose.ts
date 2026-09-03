import problemTemplatesData from "../assets/problem_templates.json" with { type: "json" };
import { classifyAttractor, solve, suggestTransitionOperators } from "../kernel/index.js";

interface ProblemTemplate {
  readonly description: string;
  readonly initial: { readonly D: number; readonly C: number };
  readonly target: { readonly D: number; readonly C: number };
  readonly diagnosis: string;
}

type ProblemKey =
  | "stuck"
  | "overwhelmed"
  | "rigid"
  | "collapsed"
  | "procrastinating"
  | "spiraling"
  | "scattered"
  | "defensive";

/** Ported from the quarry's controlled_rupture_cli.py `problem_templates`; vendored at src/assets/problem_templates.json. */
const PROBLEM_TEMPLATES = problemTemplatesData as unknown as Record<ProblemKey, ProblemTemplate>;

export function runDiagnose(problemArg: string, json: boolean): void {
  const key = problemArg as ProblemKey;
  const problem = PROBLEM_TEMPLATES[key];
  if (!problem) {
    console.error(`unknown problem "${problemArg}". Available: ${Object.keys(PROBLEM_TEMPLATES).join(", ")}`);
    process.exit(1);
  }

  const initialAttractor = classifyAttractor(problem.initial.D, problem.initial.C);
  const targetAttractor = classifyAttractor(problem.target.D, problem.target.C);
  const suggested = suggestTransitionOperators(initialAttractor, targetAttractor);
  const solution = solve({ initial: problem.initial, target: problem.target, beamWidth: 10 });

  if (json) {
    console.log(
      JSON.stringify({ problem, initialAttractor, targetAttractor, suggested, solution }, null, 2),
    );
    process.exit(0);
  }

  console.log(`problem: ${problem.description}`);
  console.log(`diagnosis: ${problem.diagnosis}`);
  console.log(`${initialAttractor} -> ${targetAttractor}`);
  // Suppressed when empty, matching controlled_rupture_cli.py:108. An empty
  // list means the pair is unmapped — most often because it is a same-attractor
  // pair, where there is no transition to suggest.
  if (suggested.length > 0) {
    console.log(`Suggested operators: ${suggested.join(", ")}`);
  }
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
