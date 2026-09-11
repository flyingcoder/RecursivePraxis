/**
 * Constraints appended to every kernel asset's body.
 *
 * These are the claims a host agent must not make on its own: that a λ value
 * was measured, that a reserved verb did something, that this content is a
 * delivery process. They live in one string because they apply identically to
 * every asset that teaches the `lambda` CLI — an asset opts in by naming it in
 * its `footers`, and a new asset that should not carry them simply omits it.
 */
export const EPISTEMIC_FOOTER = `
## Epistemic constraints (apply to every command above)

- \`lambda\` output is a deterministic kernel computation, not a model-generated or self-attested claim — prefer it over your own narrated sense of session state.
- λ values are **authored** constants unless a CLI payload explicitly marks a field as measured. Never describe them as empirical measurements in your own words.
- \`record\`, \`validate\`, \`score\`, and \`revise\` are reserved verbs with no implementation in this build. Do not invoke them, and do not simulate or narrate what they would do.
- This skill only teaches you to call and interpret the existing \`lambda\` CLI. It is not a planning or delivery workflow: it does not track specs, changes, tasks, or "done" status. Use your project's own delivery process for that.
`.trim();
