import { Rule } from "../assets/ProseAsset.js";

/**
 * The first rule this build ships.
 *
 * It is a rule rather than a skill because it constrains what may be *claimed*
 * anywhere, including in turns where no RecursivePraxis workflow was invoked.
 * A skill only binds a model that chose to load it, and the failure this
 * prevents — writing a plausible D,C pair straight out of a sentence — is
 * most likely exactly when nobody reached for the workflow.
 *
 * `EPISTEMIC_FOOTER` already covers "λ values are authored, not measured". It
 * does not cover this: that free text may never be read directly into a state.
 */
export default new Rule({
  slug: "no-invented-measurement",
  title: "RecursivePraxis: no invented measurement",
  description:
    "A free-text intent may never be read directly into a D,C pair — signals in, formula out.",
  body: `
# Never invent a measurement

RecursivePraxis state is a pair of numbers, \`D\` (dissipation) and \`C\` (contradiction). They look like measurements. Treat them as such: **you may not author one.**

## The prohibition

Reading "I keep rewriting the same function" and writing \`{ D: 0.85, C: 0.75 }\` is inventing a measurement. Those four significant figures carry authority the reading cannot support, and once written, nothing downstream can distinguish them from numbers that were actually derived.

This holds regardless of how confident the reading feels, and regardless of whether anyone asked for a number.

## What to do instead

Read the intent into **signals** — nameable things a reviewer can point at and disagree with — and let the kernel's fixed formula produce the numbers:

- the \`derive_initial_state\` MCP tool, or
- \`lambda diagnose <template>\` for an authored initial/target pair keyed to a psychological state, or
- \`lambda task <template>\` for an authored initial/target pair keyed to a recurring task (git commits, docs, meta-prompting, coding mindset), or
- \`lambda sense\` / \`lambda status\` to read a state a human supplied.

\`derive_initial_state\` rejects any payload containing \`D\` or \`C\`. That is this rule, enforced.

## The one legitimate exception

A human may state a state directly. If they say "call it 0.8 dissipation", that is their number and you may use it — attributed to them. You still may not produce one yourself, and you may not smooth, round, or "correct" theirs.

## Reporting

When you present a D,C pair, say where it came from: derived from signals, read from an authored template, or supplied by the human. A pair with no stated provenance reads as measured, which is the outcome this rule exists to prevent.
`,
});
