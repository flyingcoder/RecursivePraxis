import taskTemplatesData from "../assets/task_templates.json" with { type: "json" };
import { classifyAttractor, solve, suggestTransitionOperators } from "../kernel/index.js";

interface TaskTemplate {
  readonly description: string;
  readonly initial: { readonly D: number; readonly C: number };
  readonly target: { readonly D: number; readonly C: number };
  readonly rationale: string;
}

type TaskKey = "git-commit" | "documentation" | "meta-prompting" | "mindset" | "code-review";

/** Authored analogue of PROBLEM_TEMPLATES for recurring work rather than psychological states; vendored at src/assets/task_templates.json. */
const TASK_TEMPLATES = taskTemplatesData as unknown as Record<TaskKey, TaskTemplate>;

export function runTaskTemplate(taskArg: string, json: boolean): void {
  const key = taskArg as TaskKey;
  const task = TASK_TEMPLATES[key];
  if (!task) {
    console.error(`unknown task "${taskArg}". Available: ${Object.keys(TASK_TEMPLATES).join(", ")}`);
    process.exit(1);
  }

  const initialAttractor = classifyAttractor(task.initial.D, task.initial.C);
  const targetAttractor = classifyAttractor(task.target.D, task.target.C);
  const suggested = suggestTransitionOperators(initialAttractor, targetAttractor);
  const solution = solve({ initial: task.initial, target: task.target, beamWidth: 10 });

  if (json) {
    console.log(
      JSON.stringify({ problem: task, initialAttractor, targetAttractor, suggested, solution }, null, 2),
    );
    process.exit(0);
  }

  console.log(`task: ${task.description}`);
  console.log(`rationale: ${task.rationale}`);
  console.log(`${initialAttractor} -> ${targetAttractor}`);
  // Suppressed when empty, matching diagnose's behavior: an empty list means
  // the pair is unmapped — most often because it is a same-attractor pair.
  if (suggested.length > 0) {
    console.log(`Suggested operators: ${suggested.join(", ")}`);
  }
  console.log("");
  console.log(solution.success ? "SUCCESS" : "PARTIAL");
  console.log(`sequence: ${solution.sequence.join(" ∘ ") || "(empty)"}`);
  process.exit(0);
}

export function listTaskTemplates(json: boolean): void {
  if (json) {
    console.log(
      JSON.stringify(
        Object.entries(TASK_TEMPLATES).map(([key, t]) => ({ key, description: t.description })),
        null,
        2,
      ),
    );
    process.exit(0);
  }
  for (const [key, t] of Object.entries(TASK_TEMPLATES)) {
    console.log(`${key.padEnd(16)} ${t.description}`);
  }
  process.exit(0);
}
