# Asset Origin

These JSON files are copied, versioned assets — not runtime imports from another
repository. They are the ground-truth algebra specification for this engine.

Copied: 2026-08-20. Source formalism version: `2.0.0` (see `formalism.json` → `metadata.version`).

## Known upstream inconsistencies

These files are copied verbatim and are **not** corrected here — the engine's
behaviour is defined by what the loader actually reads, and "fixing" the data
would silently change every computed λ. They are recorded so the contradictions
are not mistaken for porting defects.

The executed values are pinned by a characterization test in
`tests/kernel/dissipation.test.ts`.

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
   Fields that *are* read: `index`, `class`, `lambda_intrinsic`, `meaning`,
   `symbol`, and `dissipation_rules`.

5. **Commutator magnitudes are `{0, 1}` only.** The loader maps `sign != 0 → 1.0`
   and `sign == 0 → 0.0`, so the pairwise interaction term is always exactly
   `0.15` for a non-commuting pair — never `c · 0.4 = 0.06`. An "enhanced"
   skeleton with empirically-derived magnitudes exists upstream but is not used
   here.
