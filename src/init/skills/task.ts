import taskTemplates from "../../assets/task_templates.json" with { type: "json" };
import { Skill } from "../assets/ProseAsset.js";
import { EPISTEMIC_FOOTER } from "../shared/epistemic-footer.js";

/** Drawn from src/assets/task_templates.json so this list can't drift from the keys `lambda task` actually accepts. */
const TASK_KEYS = Object.keys(taskTemplates)
  .map((key) => `\`${key}\``)
  .join(", ");

export default new Skill({
  slug: "task",
  title: "RecursivePraxis: task",
  description: "Run a named RecursivePraxis task template safely with `lambda task`, for recurring work like git commits, documentation, meta-prompting, and coding mindset.",
  footers: [EPISTEMIC_FOOTER],
  body: `
# RecursivePraxis: task

Run one of the canned task templates safely — a fixed initial/target D,C pair with an authored rationale, not an inference about the agent's actual state.

## Commands

List available tasks:

    lambda task --json

Run one:

    lambda task <task> --json

\`<task>\` is one of: ${TASK_KEYS}.

## When to use

Use this when the work at hand is one of the recurring tasks above, rather than a symptom of the agent's own cognitive state — see {{invoke:diagnose}} for those. Each template is an authored initial/target pair with a canned rationale string; it is not a live assessment of the current session or the current diff. Pick the template key that best matches the task; do not invent new task keys.

## Reading the output

Same shape as \`lambda solve\`, plus \`problem\` (the template used) and \`initialAttractor\` / \`targetAttractor\`. The \`rationale\` field is authored text describing the template, not a generated judgment about this particular task.
`,
});
