/**
 * Host-neutral workflow content for `lambda init`. Each definition's `body`
 * is rendered verbatim into every selected host's skill file and (where the
 * host has one) command file — see targets.ts. Do not fork this prose per
 * host; host differences belong in targets.ts frontmatter renderers only.
 */

export interface WorkflowDefinition {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly body: string;
}

const EPISTEMIC_FOOTER = `
## Epistemic constraints (apply to every command above)

- \`lambda\` output is a deterministic kernel computation, not a model-generated or self-attested claim — prefer it over your own narrated sense of session state.
- λ values are **authored** constants unless a CLI payload explicitly marks a field as measured. Never describe them as empirical measurements in your own words.
- \`record\`, \`validate\`, \`score\`, and \`revise\` are reserved verbs with no implementation in this build. Do not invoke them, and do not simulate or narrate what they would do.
- This skill only teaches you to call and interpret the existing \`lambda\` CLI. It is not a planning or delivery workflow: it does not track specs, changes, tasks, or "done" status. Use your project's own delivery process for that.
- \`lambda run\` invokes a model host and has a broader capability surface than the commands above. It is intentionally out of scope for this skill — do not treat it as a default workflow step.
`.trim();

const RAW_WORKFLOWS: readonly WorkflowDefinition[] = [
  {
    id: "status",
    title: "RecursivePraxis: status",
    summary: "Inspect the current RecursivePraxis session state via the deterministic `lambda` CLI.",
    body: `
# RecursivePraxis: status

Inspect the current RecursivePraxis session — attractor, V, D/C, λ_eff, mode, and the legal next operators — without changing anything.

## Command

    lambda status --json

## When to use

Run this first, before proposing any operator or making claims about "where the session is." The JSON payload is the deterministic kernel state; treat it as ground truth over your own narrated sense of progress.

## Reading the output

- \`attractor\`, \`V\`, \`state.D\`, \`state.C\` — the current dissipation-state reading.
- \`lambdaEffective\` / \`lambdaBand\` — computed from the session's operator sequence so far.
- \`mode\` — \`1\` (normal) or \`2\` (HALIRA escalation); see the \`session\` skill if \`mode\` is \`2\`.
- \`legalNext\` — the operators the kernel will currently accept via \`lambda step\`. This is a constraint, not a suggestion — do not propose an operator outside this list.

Without \`--json\`, \`lambda status\` prints the same information as short human-readable lines.
`,
  },
  {
    id: "analyze",
    title: "RecursivePraxis: analyze",
    summary: "Evaluate a proposed operator sequence with `lambda analyze` before committing to it.",
    body: `
# RecursivePraxis: analyze

Evaluate a proposed operator sequence — λ_eff, simulated trajectory, and grammar warnings — without touching the live session.

## Command

    lambda analyze "Op1,Op2,Op3" --json

Operators are comma-separated (or \`∘\`-separated) names from the 20-operator CORE alphabet. List them with \`lambda operators list\`.

## When to use

Use this to test a candidate sequence before committing to it with \`lambda step\`, one operator at a time. \`analyze\` is read-only — it does not mutate \`.recursive-praxis/session.json\`.

## Reading the output

- \`lambdaEffective\` — computed mean pairwise λ across the sequence.
- \`trajectory\` — simulated D/C path and attractor per step, starting from S* (D=0.5, C=0.5).
- \`warnings\` — deterministic grammar checks (forbidden transitions, Meta collapse risk, void entry). These are hard constraint checks, not opinions — do not override or reinterpret a warning in prose.
`,
  },
  {
    id: "solve",
    title: "RecursivePraxis: solve",
    summary: "Find a legal operator sequence between explicit dissipation states with `lambda solve`.",
    body: `
# RecursivePraxis: solve

Beam-search a legal operator sequence between two explicit dissipation states.

## Command

    lambda solve --initial D,C --target D,C --json

Optional: \`--beam-width N\` (default is the kernel's built-in width).

## When to use

Use this when you know both an explicit starting D,C and an explicit target D,C — for example, from \`lambda status\` (current) and a \`lambda diagnose\` template (target). \`solve\` does not read or write the live session; it is a pure search over the operator grammar.

## Reading the output

- \`success\` — whether the search reached the target attractor within the max path length.
- \`sequence\` — the operator chain found.
- \`finalState\` / \`cost\` — where the sequence actually lands and its total λ cost.

To apply a found sequence to the live session, replay it with \`lambda step --op <Op>\` calls (see the \`session\` skill), or \`lambda sense\` to jump directly to a state you already trust.
`,
  },
  {
    id: "diagnose",
    title: "RecursivePraxis: diagnose",
    summary: "Run a named RecursivePraxis diagnostic problem template safely with `lambda diagnose`.",
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
  },
  {
    id: "session",
    title: "RecursivePraxis: session",
    summary: "Drive a live session through `sense`, `step`, `halira`, and `bind`.",
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
  },
  {
    id: "ir",
    title: "RecursivePraxis: ir",
    summary: "Retrieve the current legal instruction surface with `lambda ir`.",
    body: `
# RecursivePraxis: ir

Retrieve the current turn's legal instruction surface — \`legalNext\` only — as the authoritative constraint on what the agent may propose next.

## Command

    lambda ir --json

## When to use

Call this immediately before proposing an operator, especially after any state-changing call (\`sense\`, \`step\`, \`halira start\`/\`next\`, or a rejected \`bind\`). The emitted instruction surface is the authoritative constraint enforced by \`lambda step\`, not documentation describing one — if \`ir\` and your own running sense of the session disagree, \`ir\` is correct.

Without \`--json\`, \`lambda ir\` prints the same surface as short Markdown.
`,
  },
];

export const WORKFLOWS: readonly WorkflowDefinition[] = RAW_WORKFLOWS.map((workflow) => ({
  ...workflow,
  body: `${workflow.body.trim()}\n\n${EPISTEMIC_FOOTER}`,
}));

export const WORKFLOW_IDS: readonly string[] = WORKFLOWS.map((workflow) => workflow.id);

export function lookupWorkflow(id: string): WorkflowDefinition | undefined {
  return WORKFLOWS.find((workflow) => workflow.id === id);
}
