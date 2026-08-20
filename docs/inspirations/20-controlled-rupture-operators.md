# 20 Controlled Rupture Operators

## Purpose

The twenty operators are the **named alphabet** this compiler loads from `compiler/formalism.json`: cognitive moves with an intrinsic dissipation rate `λ` and a hand-set effect `(ΔD, ΔC)` on dissipation and contradiction curvature. Extraction, compilation, and agent prose share those names. At runtime a sequence is a list of those names—not an algebraic rewrite. Each step adds `(ΔD, ΔC)` (clamped to `[0, 1]²`) and, separately, pairwise `λ` is used for cost and exponential decay of `D`.

Three attractors are labels on `(D, C)`: sterile coherence (`J=0`), productive contradiction (`S*`), collapse (`∅`).

## Overview

Each operator has an index, a Unicode symbol, a class, `lambda_intrinsic`, an effect string, and optional idempotence / absorption fields. The twenty names are a closed set for the compiler. They are grouped into four classes of five:

- **A-Constructive** — Kata, Telo, Ortho, Pro, Latch (low `λ`; class mean **0.338**)
- **B-Disruptive** — Ana, Para, Non, Fold, Flux (high `λ`; class mean **0.720**)
- **C-Reflexive** — Meta, Retro, Echo, Braid, Seed (medium `λ`; class mean **0.496**)
- **D-Structural** — Crux, Weave, Bind, Axis, Vale (mixed `λ`; class mean **0.464**; Vale is the high outlier at 0.88)

Pairwise non-commutativity lives in `compiler/commutator_skeleton.json`: a 20×20 table. Each cell is `[sign ∈ {-1, 0, +1}, resultant_index]` (resultant `0` means no mapped product). Diagonals are `[0, 0]`. Sign and resultant are treated as fixed; extraction is only supposed to refine **magnitudes**.

The calculator does **not** use the formula string in `formalism.json`. `DissipationCalculator.lambda_pairwise` implements:

`λ(i→j) = λ_j_intrinsic + min(c · |η_ij|, max_interaction)`

with `c = 0.15` and `max_interaction = 0.4`. Default `load_commutators_from_skeleton` unpacks two-element cells and sets `|η| = 1.0` if `sign ≠ 0`, else `0.0`. On that skeleton the interaction term is therefore **0.15** (not `c · 0.4 = 0.06`) for every non-commuting pair, then added to `λ_j`. Missing pairs default to `|η| = 0`.

`commutator_skeleton_enhanced.json` adds a third field (magnitude). Metadata claims 16 evidence-based pairs (15 magnitudes not in `{0, 1}`). The default loader unpacks `(sign, _)` only; feeding it the enhanced file raises. Magnitudes apply only if something calls `set_commutators`.

## Flow

1. State is a pair `(D, C)` in `[0, 1]²` (diagnose templates, analyze from `(0.5, 0.5)`, or custom endpoints).
2. A sequence is split on `∘` or commas into operator **names**.
3. **Search / trajectory** uses `_default_operator_effects()`: additive `(ΔD, ΔC)` per name, then clamp. **Analyze** also computes pairwise `λ`, `λ_eff` (mean of those pairs), total cost (sum), and `D(t) = D0 · exp(-λ_eff · t)` with `D0 = 1` in `analyze_sequence`. These two models of `D` are not unified.
4. Attractor is `classify_attractor`: `V = D + 0.4·C`; `J=0` if `V < 0.3`; `∅` if `D > 0.8` or `C > 0.9`; else `S*`. Inverse search prunes illegal next operators; `analyze` only prints warnings.

## Key Components

Inventory matches `formalism.json` (v2.0.0). Composition strings below are **declarative fields** in that file; the compiler never reduces `A ∘ B` to another operator.

- `Ana` (↑, B, λ=0.75) — analysis / abstraction; `idempotent: false`; effect increases entropy. Solver refuses `Ana` only when the path is already at `max_path_length - 1` (13 of 14).
- `Kata` (↓, A, λ=0.35) — compression; declared `Kata² = Kata`. Runtime effect `(-0.20, -0.15)`.
- `Meta` (⟲, C, λ=0.80) — self-reference; declared `Meta² = 0.6·Meta`. Solver: at most two **consecutive** Meta; Meta→Non forbidden. Analyze warns if **total** Meta count `> 2`.
- `Para` (∥, B, λ=0.65) — deviation; `idempotent: false`. Formalism names it `proj_{S*}`. Effect `(0.12, 0.18)` (comment in `phase_portrait.py` wrongly calls Para C-Reflexive).
- `Non` (¬, B, λ=0.90) — negation / rupture. Formalism also says `Non ∘ Non = 0`; runtime still applies Non’s `(+0.25, +0.20)` twice. Non→Para forbidden in the solver; analyze warns only.
- `Telo` (→, A, λ=0.25) — purpose; declared `Telo² = Telo` and `X ∘ Telo = Telo`. Runtime is just `(-0.18, -0.10)`, not an absorber.
- `Retro` (↶, C, λ=0.40) — backtrack; `idempotent: false`; effect `(-0.05, 0.0)`. Skeleton: `[Meta, Retro] = [-1, 7]` (−Retro), `[Retro, Meta] = [-1, 3]` (−Meta), so `[Meta, Retro] ≠ -[Retro, Meta]`. Formalism’s `Retro ∘ Telo = Meta` is not executed.
- `Ortho` (⊥, A, λ=0.30) — correction; declared `Ortho² = Ortho` and `Ortho ∘ Ana = Kata`.
- `Pro` (↷, A, λ=0.50) — forward; formalism lists both `Pro = I` and `Pro² = 0.5·Pro` (incompatible). Effect `(0.05, 0.02)`.
- `Echo` (⟳, C, λ=0.45) — replicate; declared `Echo² = 0.8·Echo`. Effect `(0.08, 0.06)`.
- `Braid` (⊕, C, λ=0.55) — entangle; `idempotent: false`. Effect `(0.10, 0.12)`.
- `Fold` (⋘, B, λ=0.70) — compactify; formalism `Fold ∘ Braid = Flux` is not executed. Effect `(0.18, 0.14)`.
- `Seed` (⊙, C, λ=0.28) — genesis. Class is C-Reflexive; the portrait **effect** is stabilizing `(-0.17, -0.11)` and the comment there mis-labels Seed as A-Constructive.
- `Crux` (⊗, D, λ=0.42) — pivot. Class is D-Structural (not C-Reflexive). Effect `(0.07, 0.09)`.
- `Weave` (⊚, D, λ=0.33) — integrate. Effect `(-0.16, -0.13)`.
- `Bind` (⊛, D, λ=0.38) — glue. Formalism claims `Bind ∘ Weave = Weave` and `[Bind, Weave] = 0`. The **skeleton** is `[Bind, Weave] = [1, 15]` and `[Weave, Bind] = [1, 16]` (non-commuting).
- `Axis` (⊢, D, λ=0.31) — frame. Formalism `Crux ∘ Axis = Crux` is not executed. Effect `(-0.16, -0.12)`.
- `Vale` (∅, D, λ=0.88) — void proxy; note says it amplifies against constructive ops. Effect `(0.22, 0.18)`. Formalism `Vale ∘ Non = Vale` is not executed.
- `Flux` (≈, B, λ=0.60) — continuous perturbation. Effect `(0.14, 0.11)`.
- `Latch` (⊣, A, λ=0.29) — lock; declared `Latch² = Latch`. Effect `(-0.17, -0.12)`.

## Data / State

**Operator record** (formalism): index, name, symbol, meaning, class, `lambda_intrinsic`, effect, optional `idempotent` / `idempotence_rule` / `absorption` / `identity` / `note`.

**Commutator (default):** `[sign, resultant_index]`. **Enhanced:** `[sign, resultant_index, magnitude]`.

**Skeleton-true sign-0 pairs (both directions):** `[Telo, Para]`, `[Pro, Kata]`. **Not** sign-0: `[Seed, Crux]` (`[1, 14]` / `[-1, 13]`), `[Bind, Weave]` (both signs `+1`).

**Declared only** (in `algebra_relations`, unused by Python): full/semi/never idempotence, absorption list, triples, identity/null, dissipative `[Meta, Meta] = +0.8·Meta` (skeleton diagonal is `[0, 0]`).

**Phase mapping (code):** as in Flow. Formalism basin sizes (~10.6% / 60.6% / 28.8%) are commentary; tests sample 500 points and print fractions, they do not assert those percentages.

**Operator effects:** hardcoded in `PhasePortrait._default_operator_effects`, not learned from extraction. Several comments there disagree with formalism classes (Para, Retro, Pro, Seed, Crux, Weave, Bind, Axis, Vale).

## Constraints

- Compiler search space is these twenty names. The operator extractor still harvests any matching Unicode in markdown; it does not enforce the closed set or write the skeleton.
- **Solver** (`violates_constraints`): no third consecutive Meta; no Non after Meta; no Para after Non; no Ana when `len(sequence) ≥ 13`.
- **Analyze** (`_check_warnings`): prints if total Meta `> 2`, if any step is `∅`, if Meta→Non or Non→Para appears, if `λ_eff > 0.8`. It does not reject the sequence.
- Vale is a high-`λ` / large-positive-effect collapse proxy; the solver does not special-case it beyond its effect and λ.
- Default magnitudes are `{0, 1}`. Enhanced magnitudes are unused unless loaded by a different path than `load_commutators_from_skeleton`.
- Formalism glyphs and class membership are what the compiler loads. Other tables (including Cursor rules) disagree on glyphs; **Crux is D-Structural**.

## Testing

`compiler/test_20_operators.py` (seven functions; intended all-pass on v2.0.0):

- Formalism version `2.0.0`, exactly the twenty names in that order, five per class by counting `class` fields.
- Skeleton: 20 rows, 400 cells, twenty pairs per row.
- Calculator loads 20 operators and 400 commutators; prints λ for four mixed sequences (labels “A-Constructive” / “B-Disruptive” / “C-Reflexive” include names outside those classes); asserts λ matrix shape `(20, 20)`.
- Portrait: 20 effects; **prints** Seed/Latch/Axis, Vale/Flux/Fold, Echo/Braid/Crux trajectories and a 500-sample basin split — **no attractor assertions**. From `(0.5, 0.5)`, Echo→Braid→Crux stays in `S*` while `D` and `C` rise.
- Inverse solver: 20 operators available; two problems (gentle stabilization, void escape); may emit the later eleven names; success is printed, not required.
- CLI loads 400 commutators; analyzes `Seed ∘ Weave ∘ Bind ∘ Latch`; lists five templates.
- Mean `λ` of A-Constructive is strictly less than mean `λ` of B-Disruptive.

No test asserts absorption, triples, anti-symmetry, the λ formula, or enhanced-skeleton loading.
