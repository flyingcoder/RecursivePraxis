import { Skill } from "../assets/ProseAsset.js";
import { EPISTEMIC_FOOTER } from "../shared/epistemic-footer.js";

export default new Skill({
  slug: "status",
  title: "RecursivePraxis: status",
  description: "Inspect the current RecursivePraxis session state via the deterministic `lambda` CLI.",
  footers: [EPISTEMIC_FOOTER],
  body: `
# RecursivePraxis: status

Inspect the current RecursivePraxis session — attractor, V, D/C, \`λ_eff\`, mode, and the legal next operators — without changing anything.

## Command

    lambda status --json

## When to use

Run this first, before proposing any operator or making claims about "where the session is." The JSON payload is the deterministic kernel state; treat it as ground truth over your own narrated sense of progress.

## Reading the output

- \`attractor\`, \`V\`, \`state.D\`, \`state.C\` — the current dissipation-state reading.
- \`attractorProfile\` — what that attractor is, in the formalism's words: name, description, basin, and how it is reached. When the session is in the void it also carries \`escapeRequires\`, the operators stated as the way out — read them together with \`legalNext\`, which is what the kernel will actually accept now.
- \`lambdaEffective\` / \`lambdaBand\` — computed from the session's operator sequence so far.
- \`mode\` — \`1\` (normal) or \`2\` (HALIRA escalation); see {{invoke:session}} if \`mode\` is \`2\`.
- \`legalNext\` — the operators the kernel will currently accept via \`lambda step\`. This is a constraint, not a suggestion — do not propose an operator outside this list.

Without \`--json\`, \`lambda status\` prints the same information as short human-readable lines.
`,
});
