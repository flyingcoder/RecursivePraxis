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
It is a log, not a restriction.

The values below describe what the loader currently reads. That is presently
pinned by a characterization test in `tests/kernel/dissipation.test.ts`; update
that test alongside any change to this behaviour.

1. **`algebra_relations.neutral_commutations` contradicts the skeleton.**
   It declares `[Bind, Weave] = 0` and `[Seed, Crux] = 0`, but
   `commutator_skeleton.json` has `Bind→Weave = [1, 15]`, `Weave→Bind = [1, 16]`,
   `Seed→Crux = [1, 14]`, `Crux→Seed = [-1, 13]` — all non-commuting.
   The skeleton wins: it is what the loader reads.

2. **The skeleton is not antisymmetric where the algebra implies it should be.**
   `Meta→Retro = [-1, 7]` and `Retro→Meta = [-1, 3]` carry the *same* sign, so
   `[Meta, Retro] ≠ -[Retro, Meta]`.

3. **`Pro` carries two incompatible declarations.** It is listed both as
   `identity: "Pro = I"` and `idempotence_rule: "Pro² = 0.5·Pro"`. Neither is
   executed; `Pro` has a plain runtime effect like any other operator.

4. **Declarative-only fields.** `algebra_relations` (idempotence, absorption,
   triples, identity/null, dissipative relations) and the per-operator
   `idempotent` / `idempotence_rule` / `absorption` / `effect` fields are **never
   read** by this engine. Composition strings such as `Ortho ∘ Ana = Kata` are
   documentation: the kernel never reduces one operator sequence to another.
   Fields that *are* read: `index`, `class`, `lambda_intrinsic`, `effect_vector`,
   `meaning`, `symbol`, and `dissipation_rules`.

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

5. **The skeleton carries extraction magnitudes the loader ignores.** The
   vendored file is the "enhanced" upstream skeleton (`skeleton_version`
   `v2.1.0`), whose entries are `[sign, resultant, magnitude]` rather than
   `[sign, resultant]`. The loader reads the sign only, mapping `sign != 0 →
   1.0` and `sign == 0 → 0.0`, so the pairwise interaction term is always
   exactly `0.15` for a non-commuting pair — never `c · 0.335 ≈ 0.05`.

   Sixteen of the 400 pairs — the `evidence_based_pairs` count the metadata
   declares — carry a magnitude that contradicts their own sign, and reading
   the sign only is what makes all sixteen inert. Twelve have a non-zero sign
   with a fractional magnitude (`Non→Meta = [-1, 3, 0.47]`, `Telo→Meta =
   [1, 3, 0.582]`, and ten more). Four have `sign == 0` — declared commuting —
   yet a non-zero magnitude, most starkly `Meta→Meta = [0, 0, 1]`, a
   self-commutator that is simultaneously zero and maximal.

6. **`metadata.status` asserts its own normativity.** The file declares
   `"status": "GROUND TRUTH - COGNITIVE BOOTLOADER SPECIFICATION"` and
   `"architecture_role": "This is the mechanical interpreter for the cognitive
   bootloader. Not metaphorical."` Those strings are part of the copied asset
   and are not read by anything. They describe the upstream document's
   ambition, not this engine's contract: what this engine executes is the
   subset listed in item 4, and where the data disagrees with itself (items 1–3)
   the loader's behaviour — not the `status` line — is authoritative.

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
