import { Skill } from "../assets/ProseAsset.js";
import { EPISTEMIC_FOOTER } from "../shared/epistemic-footer.js";

export default new Skill({
  slug: "derive",
  title: "RecursivePraxis: derive",
  description:
    "Derive a (D, C) arc from a stated intent through the RecursivePraxis MCP tools, when no authored `lambda diagnose` template fits.",
  footers: [EPISTEMIC_FOOTER],
  body: `
# RecursivePraxis: derive

Turn a stated intent into an operator sequence when no authored template fits — without inventing the numbers.

## The rule this workflow exists to enforce

**Never read an intent directly into a D,C pair.** Reading "I keep rewriting the same function" and writing \`{ D: 0.85, C: 0.75 }\` invents a measurement: those numbers carry four significant figures of authority the reading cannot support, and nothing downstream can tell them apart from numbers that were derived.

You read the intent into **signals** — things a reviewer can point at and disagree with. A fixed formula turns signals into numbers. Your judgment stays visible and arguable; the arithmetic stays checkable.

The \`derive_initial_state\` tool will reject a payload containing \`D\` or \`C\`. That rejection is the rule, not a validation quirk.

## Step 1 — read the intent into signals

Write down, from the human's own words and the transcript:

- \`failedChecks\` — things that **demonstrably failed**. Name each one.
- \`unresolvedClaims\` — assertions **nothing has settled**. Name each one.
- \`contradictionDetected\` — did they state two mutually exclusive requirements?
- \`uncertainty\` — 0..1, how unsure the request sounds.

Name each entry rather than counting silently, so a reviewer can challenge it: *"that check didn't fail"*, *"that claim was resolved last turn"*. That challengeability is the entire difference between this and picking 0.85 by feel.

\`uncertainty\` is the only free scalar here and the one to be most suspicious of. The other three are counts of nameable things — prefer moving weight onto them.

Note that "fully automated, zero-touch, under five minutes" together with "a senior engineer signs off on every change" is a **contradiction**, not a complexity problem. Set the flag.

## Step 2 — derive the initial state

Call \`derive_initial_state\` with those four fields. It returns \`initial\` and \`initialLabel\`.

The label is **computed**, never guessed. Do not second-guess it, and do not describe the returned numbers as a measurement of the human's state — they are the output of an authored formula whose constants nobody has calibrated against anything.

## Step 3 — choose where this should land

Call \`plan_arc\` with the derived \`initial\`.

\`targetLabel\` is your **one irreducible judgment**, and it is a choice among three values — \`J=0\` (settled), \`S*\` (productively agitated), \`∅\` (collapsed) — not a continuum. Omit it when the intent does not say, and the engine's standing stable target is used.

Read the two findings it returns:

- **\`sameLabel: true\`** — the state the intent describes is already the state it asked for. Report that as the finding it is: *"you are already where you asked to be."* Do **not** re-roll the target to get a non-empty arc; that fabricates a problem in order to have one to solve.
- **\`towardCostlierAttractor: true\`** — the arc runs toward collapse. Mention it, but do not refuse. Some intents genuinely want more agitation, not less.

## Step 4 — verify before you report anything

Call \`verify_arc\` with \`initial\`, \`target\`, and the labels you are about to put in front of the human. A claimed label the kernel disagrees with is rejected — nothing is presented as a label until this passes.

Then read three fields, in this order:

1. **\`alreadyWithinRadius\`** — if true, the empty sequence *is* the answer. \`success\` is \`true\` here too, so reporting "SUCCESS" alone would announce a solved plan when the truth is **nothing to do**. Say the latter.
2. **\`partial\`** — the operator algebra could not reach this target. Report it plainly; do not present a partial trajectory as a plan that arrives.
3. **\`unusedDiagnosisOperators\`** — operators your diagnosis names that the solver never reaches for. A **flag, not an error**: a diagnosis may correctly name the *cause* where the sequence supplies the *cure*. Never rewrite your diagnosis just to clear it.

## Step 5 — write the diagnosis

Name a **failure mode**, not a prescription. House style, from the shipped templates:

- \`Meta ∘ Meta loop (infinite reflection)\` — too much of one operator
- \`Excessive Ana without Kata (no compression)\` — an unbalanced pair
- \`In the Void (∅), need rescue operators\` — a location

Draw only on the operators in \`suggested\`. A diagnosis naming an operator irrelevant to the arc reads as authoritative and is not.

## Step 6 — render the sequence as instructions

    lambda operators show <Op>

One section per operator, in the order \`verify_arc\` returned them. The operator supplies the structure; you supply the human's subject matter. Never reorder, append to, or drop an operator from the returned sequence — that is a defect, not an adaptation.

## When to use this instead of a template

Prefer {{invoke:diagnose}} when a symptom matches an authored template: those carry a human-written diagnosis, which is better than a derived one. Use this skill when {{invoke:intent}} classified the request as \`none\`.
`,
});
