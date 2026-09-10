import problemTemplates from "../../assets/problem_templates.json" with { type: "json" };
import { Skill } from "../assets/ProseAsset.js";
import { EPISTEMIC_FOOTER } from "../shared/epistemic-footer.js";

/** Drawn from src/assets/problem_templates.json so this list can't drift from the keys `lambda diagnose` actually accepts. */
const PROBLEM_KEYS = Object.keys(problemTemplates)
  .map((key) => `\`${key}\``)
  .join(", ");

export default new Skill({
  slug: "intent",
  title: "RecursivePraxis: intent",
  description: "Turn an unstructured human request into an operator sequence by classifying it into an authored `lambda diagnose` template.",
  footers: [EPISTEMIC_FOOTER],
  body: `
# RecursivePraxis: intent

Turn an unstructured human request into an operator sequence without inventing either the numbers or the sequence.

## The rule this workflow exists to enforce

You do exactly two things: classify the request, and render the result. You never author the operator sequence, and you never author a D/C pair — \`lambda\` authors both. If you find yourself reordering, appending to, or dropping an operator from what the CLI returned, stop. That is a defect, not an adaptation.

## Step 1 — read the request as tension, not as a summary

Summarizing discards the thing the classification depends on. Before choosing a template, write down, from the human's own words:

- the unresolved claims — what is asserted but not yet settled
- the failing checks — what is already known not to work
- whether two stated requirements are mutually exclusive

"Fully automated, zero-touch, under five minutes" combined with "a senior engineer signs off on every change" is a contradiction, not a complexity problem. Name it as one.

## Step 2 — classify into one authored template

List the available keys:

    lambda diagnose --json

Pick exactly one of ${PROBLEM_KEYS} — or answer \`none\`.

\`none\` is a normal answer and often the correct one. The templates do not cover every request, and a contradiction between stated requirements is not among them. Choose \`none\` rather than forcing the nearest fit.

If you are not confident in a key, say so and stop. Abstaining keeps the human in the loop; a confident wrong key produces a sequence that looks authoritative and is not.

## Step 3 — get the sequence from the CLI

    lambda diagnose <key> --json

\`problem.initial\` and \`problem.target\` come from the authored template; \`solution.sequence\` comes from the kernel's beam search. Neither is yours to adjust.

If the classification was \`none\`, do not fall back to guessing a D,C pair. Derive one instead: {{invoke:derive}} reads the request into named signals and lets the kernel compute the numbers. Where a state already exists, take the current reading from \`lambda status --json\` and supply an explicit target — see {{invoke:solve}}.

## Step 4 — verify the sequence survived the trip

    lambda check <Op> <Op> …
    lambda analyze "Op1,Op2,Op3" --json

\`check\` hard-rejects any sequence that violates the grammar. Run it on the exact operator list you are about to write instructions from: a rejection here means the sequence was altered between Step 3 and now.

Then read \`solution.success\`. A \`PARTIAL\` result means the search did not reach the target within the max path length. Report that plainly — do not present a partial trajectory as a plan that arrives.

## Step 5 — render the sequence as instructions

    lambda operators show <Op> [<Op>…]

Call this once with the full sequence, in order. It returns JSON — one object per operator, each with \`meaning\` and \`effect\`, in the order you passed them. Use those fields as the skeleton of your output: one section per operator, ordered as returned. Fill each section with the human's actual subject matter. The operator supplies the structure; you supply the vocabulary.

Do not explain the operator alphabet to the human unless asked, and do not cite operator names as justification for advice you had already decided on.

## Reading the output

- \`problem.description\` / \`problem.diagnosis\` — authored template text, not a judgment about this request.
- \`solution.sequence\` — the operator chain, and the only ordering that is legal to act on.
- \`initialAttractor\` / \`targetAttractor\` — where the authored template starts and aims (top level, beside \`problem\`).
- \`solution.success\` — see Step 4.
`,
});
