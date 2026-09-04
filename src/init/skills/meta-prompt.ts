import { Skill } from "../assets/ProseAsset.js";
import { EPISTEMIC_FOOTER } from "../shared/epistemic-footer.js";

export default new Skill({
  slug: "meta-prompt",
  title: "RecursivePraxis: meta-prompt",
  description:
    "Compose an operator chain plus a stated intent into one prompt whose every clause traces to an operator field, instead of hand-writing a step per operator.",
  footers: [EPISTEMIC_FOOTER],
  body: `
# RecursivePraxis: meta-prompt

Use this when someone gives you a task **and** an operator chain — \`Research about torsion field. Apply Axis ∘ Ana ∘ Pro ∘ Para ∘ Kata ∘ Latch.\` — and wants the chain to shape the resulting prompt.

## The rule this workflow exists to enforce

**A chain is not a schedule of sections.** Rendering it as "Step 1 (Axis): do the framing. Step 2 (Ana): do the analysis." invents structure the notation does not carry.

\`∘\` is composition. What composes is a set of **properties the finished prompt exhibits — all of them at once, in every paragraph**. \`Axis ∘ Ana\` does not mean "frame, then analyse". It means "analytical, within a fixed frame".

The discipline that replaces the step list: every clause in the composed prompt must trace to a **named field** of a named operator. A clause nobody can trace to one is a clause the chain did not license, however good it sounds.

## Step 1 — compose it with the tool, not by hand

Call the \`compose_prompt_policy\` MCP tool with the intent and the chain:

\`\`\`json
{ "intent": "Research about torsion field",
  "chain": ["Axis", "Ana", "Pro", "Para", "Kata", "Latch"] }
\`\`\`

Without MCP, the CLI does the same thing:

\`\`\`
lambda meta-prompt "Research about torsion field" "Axis,Ana,Pro,Para,Kata,Latch"
\`\`\`

Both accept \`∘\` or \`,\` as the separator. Do not compose the brief yourself from the operator meanings: the adjective, the license, the exit test, the commit right and the lifetime of each property are all read from \`formalism.json\` and the engine's authored policy tables, and a model writing them from memory is the failure mode this tool exists to prevent.

An illegal chain is **rejected, not repaired**. If the tool refuses, report the named constraint it cites and ask for a different chain — do not quietly drop or reorder an operator to make it pass.

## Step 1b — substitute an adjective only when you can name the misfit

Each property is introduced by an adjective — \`Work **analytical**\` — derived from that operator's \`meaning\` and reviewed once, in code. It is deliberately blind to your intent, and occasionally that shows: \`Ana\` means "break apart, raise conceptual level", which over a crash triage is closer to *isolating a fault* than to raising any conceptual level.

You may supply one word for one operator, with a reason:

\`\`\`json
{ "intent": "Find why the parser drops the last token",
  "chain": ["Axis", "Ana", "Ortho", "Kata", "Latch"],
  "adjectives": [{ "op": "Ana", "adjective": "diagnostic",
                   "reason": "the intent is a crash triage, where breaking apart isolates a fault" }] }
\`\`\`

On the CLI the same list goes in a file: \`lambda meta-prompt "<intent>" "<chain>" --adjectives adj.json\`.

Read \`lambda operators show <Op> [<Op>…]\` before you do — the \`meaning\` you are claiming misfits is right there, and the reason you give should refer to it.

**The default is not to.** A substituted word is labelled as yours in the brief itself and listed in \`verification.callerSuppliedAdjectives\`, because the discipline above — every clause traces to a named operator field — is exactly what an unlabelled model-authored adjective would quietly break. That labelling is the price of the seam, not a bug in it: leave it visible, and do not paraphrase it away when passing the brief on.

Three things the engine will refuse, none of them worth working around: an adjective for an operator the chain does not contain, an adjective that would leave two operators indistinguishable, and an adjective without a reason. A substitution you cannot justify in one clause is a preference, and preferences do not get the operator's authority.

## Step 2 — use the brief as returned

\`brief\` is the composed prompt. Hand it on, or act on it, as one standing description.

Do not re-expand it into numbered per-operator sections. That is the step-list reading re-entering through layout, and \`verification.perOperatorHeadings\` will report it if you have.

## Step 3 — read the three things the tool tells you about the chain

- **\`netContractive\`** — when true, the composed policy contracts on both axes, so the brief must end closed. The divergent properties in it (anything \`mayCommit: false\`) are then bounded licenses, not an instruction to explore openly.
- **\`seams\`** — the pairwise cost of holding two properties together. The costliest one or two are where the composed prompt is most likely to come apart, and the brief already names them. Keep that sentence.
- **\`properties[].mayCommit\`** — \`false\` means read-only by construction: that property may require alternatives and counterexamples but may **never** be the one that settles a question. Only the committing properties may close the brief.
- **\`verification.callerSuppliedAdjectives\`** — the operators whose adjective came from you rather than the table. Empty is the normal answer. If it is not, those are the clauses a reviewer cannot check against \`formalism.json\`, and you owe them the reason you gave.

## Step 4 — say what the chain does not cover

The tool composes what it was given; it does not audit the choice. Before handing the brief on, check what class of operator is **absent** and say so plainly if it matters — a chain with no \`Ortho\` ("aligns with truth") has nothing that checks its own synthesis against ground truth, which is a real gap on a factual research task, not a stylistic one.

Report it as a flag. Do not add an operator the human did not ask for.
`,
});
