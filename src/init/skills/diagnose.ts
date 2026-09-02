import { Skill } from "../assets/ProseAsset.js";
import { EPISTEMIC_FOOTER } from "../shared/epistemic-footer.js";

export default new Skill({
  slug: "diagnose",
  title: "RecursivePraxis: diagnose",
  description: "Run a named RecursivePraxis diagnostic problem template safely with `lambda diagnose`.",
  footers: [EPISTEMIC_FOOTER],
  body: `
# RecursivePraxis: diagnose

Run one of the canned problem templates safely — a fixed initial/target D,C pair with a named diagnosis, not an inference about the agent's actual state.

## Commands

List available problems:

    lambda diagnose --json

Run one:

    lambda diagnose <problem> --json

\`<problem>\` is one of: \`stuck\`, \`overwhelmed\`, \`rigid\`, \`collapsed\`, \`procrastinating\`.

## When to use

Use this when a symptom matches one of the five named templates. Each template is an authored initial/target pair with a canned diagnosis string — it is not a live assessment of the current session. Pick the template key that best matches the reported symptom; do not invent new problem keys.

## Reading the output

Same shape as \`lambda solve\`, plus \`problem\` (the template used) and \`initialAttractor\` / \`targetAttractor\`. The \`diagnosis\` field is authored text describing the template, not a generated judgment about this particular session.
`,
});
