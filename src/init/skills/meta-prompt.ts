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

## Step 2 — use the brief as returned

\`brief\` is the composed prompt. Hand it on, or act on it, as one standing description.

Do not re-expand it into numbered per-operator sections. That is the step-list reading re-entering through layout, and \`verification.perOperatorHeadings\` will report it if you have.

## Step 3 — read the three things the tool tells you about the chain

- **\`netContractive\`** — when true, the composed policy contracts on both axes, so the brief must end closed. The divergent properties in it (anything \`mayCommit: false\`) are then bounded licenses, not an instruction to explore openly.
- **\`seams\`** — the pairwise cost of holding two properties together. The costliest one or two are where the composed prompt is most likely to come apart, and the brief already names them. Keep that sentence.
- **\`properties[].mayCommit\`** — \`false\` means read-only by construction: that property may require alternatives and counterexamples but may **never** be the one that settles a question. Only the committing properties may close the brief.

## Step 4 — say what the chain does not cover

The tool composes what it was given; it does not audit the choice. Before handing the brief on, check what class of operator is **absent** and say so plainly if it matters — a chain with no \`Ortho\` ("aligns with truth") has nothing that checks its own synthesis against ground truth, which is a real gap on a factual research task, not a stylistic one.

Report it as a flag. Do not add an operator the human did not ask for.
`,
});
