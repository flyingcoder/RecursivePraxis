import { Skill } from "../assets/ProseAsset.js";
import { EPISTEMIC_FOOTER } from "../shared/epistemic-footer.js";

export default new Skill({
  slug: "session",
  title: "RecursivePraxis: session",
  description: "Drive a live session through `sense`, `step`, `halira`, and `bind`.",
  footers: [EPISTEMIC_FOOTER],
  body: `
# RecursivePraxis: session

Walk a live session — from a D/C reading through operator steps to a bound sequence — using \`sense\`, \`step\`, \`halira\`, and \`bind\`. Session state persists in \`.recursive-praxis/session.json\`.

## Commands

Set the session's state directly:

    lambda sense --d <n> --c <n> --json

Only call \`sense\` with a D/C reading you actually have (e.g. from \`lambda status\` on a related task, or a value the user gave you) — do not fabricate numbers to force a particular attractor.

Apply one operator:

    lambda step --json
    lambda step --op <Op> --json

Without \`--op\`, \`step\` auto-picks the cheapest legal transition — a deterministic heuristic, not a search. For an actual search over multiple steps, use \`lambda analyze\` or \`lambda solve\` first, then drive \`step --op <Op>\` through the resulting sequence.

Mode-2 escalation (only after repeated Mode-1 bind failures — check \`mode1FailureCount\` in \`lambda status\`):

    lambda halira start --json
    lambda halira next --json
    lambda halira status --json

Finalize the session:

    lambda bind --json

\`bind\` fails closed: it rejects without an anomaly artifact, and it has no \`--force\` — there is no bypass. On rejection, follow the error/status the CLI prints (it will report \`mode1FailureCount\` and, once the HALIRA gate is reached, the Mode-2 step sequence) rather than retrying the same call.

## Reading the output

Every one of these commands returns the same status shape as \`lambda status\` (\`attractor\`, \`V\`, \`state\`, \`lambdaEffective\`, \`mode\`, \`legalNext\`), plus a field naming what just happened (\`applied\`, \`sensed\`, \`bound\`, \`haliraStepName\`). Use \`legalNext\` after each call to decide what is actually available next — do not assume the previous plan is still legal after a rejected call.
`,
});
