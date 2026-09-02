import { Skill } from "../assets/ProseAsset.js";
import { EPISTEMIC_FOOTER } from "../shared/epistemic-footer.js";

export default new Skill({
  slug: "solve",
  title: "RecursivePraxis: solve",
  description: "Find a legal operator sequence between explicit dissipation states with `lambda solve`.",
  footers: [EPISTEMIC_FOOTER],
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

To apply a found sequence to the live session, replay it with \`lambda step --op <Op>\` calls (see {{invoke:session}}), or \`lambda sense\` to jump directly to a state you already trust.
`,
});
