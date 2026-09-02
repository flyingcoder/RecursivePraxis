import { Skill } from "../assets/ProseAsset.js";
import { EPISTEMIC_FOOTER } from "../shared/epistemic-footer.js";

export default new Skill({
  slug: "ir",
  title: "RecursivePraxis: ir",
  description: "Retrieve the current legal instruction surface with `lambda ir`.",
  footers: [EPISTEMIC_FOOTER],
  body: `
# RecursivePraxis: ir

Retrieve the current turn's legal instruction surface — \`legalNext\` only — as the authoritative constraint on what the agent may propose next.

## Command

    lambda ir --json

## When to use

Call this immediately before proposing an operator, especially after any state-changing call (\`sense\`, \`step\`, \`halira start\`/\`next\`, or a rejected \`bind\`). The emitted instruction surface is the authoritative constraint enforced by \`lambda step\`, not documentation describing one — if \`ir\` and your own running sense of the session disagree, \`ir\` is correct.

Without \`--json\`, \`lambda ir\` prints the same surface as short Markdown.
`,
});
