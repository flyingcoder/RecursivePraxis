import { Skill } from "../assets/ProseAsset.js";
import { EPISTEMIC_FOOTER } from "../shared/epistemic-footer.js";

export default new Skill({
  slug: "analyze",
  title: "RecursivePraxis: analyze",
  description: "Evaluate a proposed operator sequence with `lambda analyze` before committing to it.",
  footers: [EPISTEMIC_FOOTER],
  body: `
# RecursivePraxis: analyze

Evaluate a proposed operator sequence — \`λ_eff\`, simulated trajectory, and grammar warnings — without touching the live session.

## Command

    lambda analyze "Op1,Op2,Op3" --json

Operators are comma-separated (or \`∘\`-separated) names from the 20-operator alphabet. List them with \`lambda operators list\`.

## When to use

Use this to test a candidate sequence before committing to it with \`lambda step\`, one operator at a time. \`analyze\` is read-only — it does not mutate \`.recursive-praxis/session.json\`.

## Reading the output

- \`lambdaEffective\` — computed mean pairwise λ across the sequence.
- \`trajectory\` — simulated D/C path and attractor per step, starting from \`S*\` (D=0.5, C=0.5).
- \`warnings\` — deterministic grammar checks (forbidden transitions, Meta collapse risk, void entry). These are hard constraint checks, not opinions — do not override or reinterpret a warning in prose.
- \`algebra\` — what the formalism *states about the operators in the sequence*: adjacent pairs it relates, whether the measured commutator agrees with each stated relation, the classes in play, and any operator it calls a projection onto an attractor.

## Reading \`algebra\`

These are statements in the formalism's function-space algebra, and this engine composes displacements. **They describe; they never rewrite.** \`Ortho ∘ Ana = Kata\` does not license replacing that pair with \`Kata\`, dropping a repeated operator, or reordering anything — the sequence you analyzed is the sequence you run. Use them to explain a choice ("these two are a pair the formalism relates"), never to shorten one.

Where \`corroboration.agrees\` is \`false\`, two authored sources disagree about the pair — the stated relation and the vendored commutator skeleton. Report the disagreement; do not pick a winner.
`,
});
