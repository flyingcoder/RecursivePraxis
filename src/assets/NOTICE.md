# Asset Origin

These JSON files are copied, versioned assets — not runtime imports from another
repository. They were the starting algebra specification this engine's kernel
was ported from.

Copied: 2026-08-20. Source formalism version: `2.0.0` (see `formalism.json` → `metadata.version`).

## Policy: upstream is inspiration, not a constraint

As of 2026-09-02, this repository does not treat the vendored copy as
unmodifiable ground truth. Earlier revisions of this file argued that "fixing"
the data would be wrong because it would silently change every computed λ, and
closed several bug reports on that basis (see item 4). That argument is
retracted as a *blanket* rule: it correctly describes what happens today if
nothing else changes, but it is not a reason to leave an inconsistency alone
forever. The ported TypeScript kernel is free to diverge from the vendored
JSON — including resolving any of the inconsistencies below — whenever doing
so serves this engine; "upstream says X" is not by itself a reason to decline
a change here.

## Known upstream inconsistencies

The list below records contradictions inherited from the vendored files, kept
for diagnostic value — so a reader doesn't mistake them for porting defects,
and so anyone changing this behaviour knows what they're changing away from.
It is a log, not a restriction. Items 1, 3, 5, and 9 have been resolved (dated
below); the rest are either genuinely open or, on inspection, not bugs at all.

1. **Resolved 2026-09-02.** `algebra_relations.neutral_commutations` declared
   `[Bind, Weave] = 0` and `[Seed, Crux] = 0`, contradicting
   `commutator_skeleton.json`'s `Bind→Weave = [1, 15]`, `Weave→Bind = [1, 16]`,
   `Seed→Crux = [1, 14]`, `Crux→Seed = [-1, 13]` — all non-commuting, and each
   carrying a clean (non-contradictory) extraction magnitude of `1.0`, unlike
   the pairs in item 5. The two false claims were removed from
   `neutral_commutations`, which now lists only the pairs the skeleton agrees
   are commuting (`[Telo, Para]`, `[Pro, Kata]`).

2. **Open — and larger than the one example usually cited.** The original
   framing of this item singled out `Meta→Retro = [-1, 7]` and
   `Retro→Meta = [-1, 3]` as carrying the *same* sign, so `[Meta, Retro] ≠
   -[Retro, Meta]` where "the algebra implies it should" hold. That
   understated it: across the skeleton's 336 off-diagonal pairs with a nonzero
   sign in at least one direction, 236 (70%) carry the *same* sign in both
   directions. Strict antisymmetry is not a property this skeleton mostly has
   with a Meta/Retro-shaped exception — it is a property this skeleton mostly
   does not have. Flipping Meta/Retro's sign alone would not make the skeleton
   antisymmetric and would misrepresent the fix as more complete than it is;
   nothing in the vendored data or `docs/inspirations/` says which direction's
   sign is the "correct" one for any given pair, so there is no principled
   single-pair correction here — only a global restructuring this repo has no
   grounds to invent unilaterally. Left as a documented shape of the data.
   Runtime-inert either way: `commutatorMagnitude` (post item 5) reads the
   *magnitude* field, never the sign's value, only whether context elsewhere
   treats it as zero or nonzero.

3. **Resolved 2026-09-02.** `Pro` carried two incompatible declarations: the
   per-operator `identity: "Pro = I (identity element)"` and
   `idempotence_rule: "Pro² = 0.5·Pro"`, plus a third restatement of the same
   identity claim in `algebra_relations.identity_and_null.identity`. Neither
   was ever executed. Both `identity` declarations were removed, leaving
   `idempotent: "semi"` / `idempotence_rule: "Pro² = 0.5·Pro"` — consistent
   with how `Meta` and `Echo`, the other two `"semi"` operators, are declared.

4. **Declarative-only fields.** Composition strings such as `Ortho ∘ Ana = Kata`
   are descriptive: the kernel never reduces one operator sequence to another,
   and nothing here is enforced.

   *Read, but only ever reported.* `algebra_relations` — absorption laws,
   triples, neutral commutations, anti-symmetry exceptions, dissipative
   relations, `identity_and_null` — is parsed by `src/kernel/algebra.ts` and
   reported over a chain's adjacent pairs by `src/ir/chainReading.ts`, through
   `lambda analyze` and the `read_chain_algebra` MCP tool. Every rendering
   carries a caveat saying it changes nothing. `phase_portrait.attractors`'
   prose (name, description, basin, characteristics, `reached_by`,
   `escape_requires`) is read the same way, by `attractorProfile`.

   *Read and load-bearing:* `index`, `class`, `lambda_intrinsic`,
   `effect_vector`, `meaning`, `symbol`, `effect`, `idempotent` /
   `idempotence_rule`, `dissipation_rules`, `phase_portrait.transitions`,
   `lyapunov.alpha`, `J=0`'s `lyapunov_threshold`, and
   `inverse_solver.attractor_penalties`.

   *Still unread, deliberately:* `algebra_relations.idempotence` and the
   per-operator `absorption` field, both of which restate something the
   per-operator `idempotent` / `idempotence_rule` fields and
   `absorption_laws` already carry — a second reader would be a second source
   of truth. Also `metadata`, `cognitive_bootloader_integration`, Vale's
   `note`, `commutator_skeleton` (superseded by the vendored
   `commutator_skeleton.json`), and `dissipation_rules`' `formula` /
   `decay_law` / `effective_lambda` strings, which state in prose what
   `dissipation.ts` implements in code. The prose is now checked against the
   code by test rather than merely believed — see item 9.

   These fields are a **parallel descriptive model over function composition** —
   not a specification this engine has failed to implement. The engine models
   operators as *displacements in D/C space*; `algebra_relations` models them as
   *composable functions*. Both are coherent, they are simply different objects,
   and "the engine does not enforce idempotence / absorption / `Telo`
   terminality" is therefore not, by itself, a defect — see the reasoning in
   `docs/ALGEBRA_DYNAMICS_SEAM.md` §1–2 (three earlier bug reports on this gap
   were closed on that argument). That reasoning is about which model governs
   runtime behaviour, not about upstream authority, and stands independently
   of the policy change above.

5. **Resolved 2026-09-02.** The vendored file is the "enhanced" upstream
   skeleton (`skeleton_version` `v2.1.0`), whose entries are
   `[sign, resultant, magnitude]` rather than `[sign, resultant]`.
   `commutatorMagnitude` (`src/kernel/commutator.ts`) previously read the sign
   only, mapping `sign != 0 → 1.0` and `sign == 0 → 0.0`, discarding the
   magnitude — so the pairwise interaction term was always exactly `0.15` for
   a non-commuting pair, never e.g. `c · 0.335 ≈ 0.05`. It now returns the
   magnitude field directly, matching `dissipation_rules.formula`'s own
   `|η_{ij}|` term literally.

   For 384 of the 400 pairs this changes nothing: their magnitude already
   equals what the old binary mapping produced. Sixteen pairs — the
   `evidence_based_pairs` count the metadata declares — carry a magnitude that
   contradicts their own sign; those are the ones now computed differently.
   Twelve have a non-zero sign with a fractional magnitude (`Non→Meta =
   [-1, 3, 0.47]`, `Telo→Meta = [1, 3, 0.582]`, and ten more). Four have
   `sign == 0` — architecturally "commuting" — yet a non-zero magnitude, most
   starkly `Meta→Meta = [0, 0, 1]`. No reconciliation was applied to these
   sixteen: the magnitude is trusted as-is in both cases, including where it
   disagrees with a `0` sign (see `tests/kernel/dissipation.test.ts`, and
   `docs/ALGEBRA_DYNAMICS_SEAM.md`'s `rigid` case, whose filtered path now
   costs 11.2% of J instead of 7.0% because it steps through `Para,Para`, one
   of the four).

6. **`metadata.status` asserts its own normativity.** The file declares
   `"status": "GROUND TRUTH - COGNITIVE BOOTLOADER SPECIFICATION"` and
   `"architecture_role": "This is the mechanical interpreter for the cognitive
   bootloader. Not metaphorical."` Those strings are part of the copied asset
   and are not read by anything. They describe the upstream document's
   ambition, not this engine's contract: what this engine executes is the
   subset listed in item 4 (as amended by items 1, 3, and 5 above).

7. **Phase-portrait tables have distinct contracts.** The JSON's five-entry,
   two-operator-per-entry table (`S_star_to_J0`, `J0_to_S_star`,
   `S_star_to_void`, `void_to_S_star`, `void_to_J0`) is read by
   `canTransition`: every listed operator must be present for its formalism
   transition to hold. The richer six-entry Python table is separately retained
   for `suggestTransitionOperators`, because it produced the upstream CLI's
   advisory output. A suggestion is not a formalism transition requirement.

8. **`effect_vector` is this repo's addition, not part of the upstream copy.**
   Every other field under `operators.<Op>` came from the vendored source
   described above. `effect_vector: [ΔD, ΔC]` did not — it is the same
   class-generated placeholder previously kept only as `DEFAULT_OPERATOR_EFFECTS`
   in `src/kernel/phasePortrait.ts` (see that constant's doc comment for
   provenance: generated from operator class, not measured, no calibration
   against an observed agent outcome). It was folded into this file so the
   per-operator numbers live in one place, not because it became upstream
   ground truth. `lambdaIntrinsic` and `effect_vector` remain two different
   kinds of number reached through the same loader — see
   [docs/VOCABULARY.md](../../docs/VOCABULARY.md) and the "Where they overlap"
   note in `phasePortrait.ts`. The seam that lets a caller override these
   values (`OperatorEffects`, `SolveOptions.effects`, `createInitialSession`)
   is unaffected: `DEFAULT_OPERATOR_EFFECTS` now reads this field instead of
   declaring the numbers twice, but any caller can still substitute a whole
   different table.

9. **Resolved 2026-09-04.** `dissipation_rules.formula` stated
   `λ(i→j) = λ_j_intrinsic + c·min(0.4, |η_{ij}|)` — the clamp around `|η|` —
   while `dissipation.ts` computes `λ_j + min(c·|η|, max)`, the clamp around
   the scaled term. The two differ on every pair with `|η| > 0.4`, capping the
   interaction at 0.06 and 0.15 respectively, so this was not cosmetic.

   The implementation is the sound reading and both prose statements were
   wrong. `docs/20_CONTROLLED_RUPTURE_OPERATORS.md` records that
   upstream's `DissipationCalculator.lambda_pairwise` implements
   `λ_j_intrinsic + min(c · |η_ij|, max_interaction)` and — in that document's
   words — "does not use the formula string in `formalism.json`": the
   transposition is inherited, and upstream never read its own statement of it.
   `lambdaPairwise`'s docstring had transposed it independently while the code
   below it was right. Both strings were corrected to the implemented form; no
   behaviour changed, and no pinned value moved.

   This also retires an inference drawn while auditing this seam, which read
   `max_interaction_magnitude`'s inertness as evidence that the *code* had
   transposed the formula. The constant is inert upstream too, for the same
   reason (`|η| ≤ 1`, `c = 0.15`, so `c·|η| ≤ 0.15 < 0.4`); it is a faithfully
   ported constant that nothing depends on, not a clue. `tests/kernel/dissipation.test.ts`
   now pins which side the clamp is on, across all 400 pairs, and checks the
   JSON string against the implemented formula.
