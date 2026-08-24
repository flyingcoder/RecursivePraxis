# Suggestion — the algebra/dynamics seam: findings and backlog

Status: suggestion, planning only. Nothing here has been implemented.
See [NOTICE.md](NOTICE.md).

This records an investigation into why a *semantically* reasoned operator
sequence and the *solver's* answer disagree, what that disagreement measures,
and what should be done about it. It is written to be actionable without
re-running the investigation.

---

## 0. The finding in one line

The formalism is an **algebra over operators** (composition, absorption,
idempotence). The engine is a **dynamical system over states** (additive
`(ΔD, ΔC)` displacement, summed transition costs). Neither is wrong. What is
missing is a specified relationship between them — and three things that look
like bugs are actually that seam showing through.

---

## 1. Decisions that ground everything below

Two questions were open. Both are now answered (operator's call):

1. **λ is a property of transitions**, not of moves.
2. **Operators are displacements**, not functions.

Everything in §2 and §3 follows from these. If either is revisited, re-derive.

---

## 2. Withdrawn — do not re-file these

All three were category errors that dissolve under §1. They are recorded so the
next reader does not rediscover and "fix" them.

| Apparent bug | Why it is not one |
|---|---|
| The first operator is free (`totalDissipationCost` returns 0 for length < 2) | λ is a transition property; *n* operators have *n−1* transitions. A single-operator sequence has nothing to dissipate along. Correct as written. |
| Idempotence is unenforced (`Kata → Kata` descends twice) | `Kata² = Kata` describes composition of *functions*. Operators are displacements. Repeating one legitimately displaces twice. |
| `Telo` has no terminal privilege | `X ∘ Telo = Telo` is an absorption law in function-space. It makes no claim about displacement ordering. |

Note the residue from the first row: the free opening move is *correctly*
priced at zero, but it means the first operator is selected with no λ signal at
all. That is a gap in the objective, not in the cost function — see A.

---

## 3. Backlog

| # | Item | Size | Depends on |
|---|---|---|---|
| 1 | **C1** — restore the `operator_effects` injection point | small | — |
| 2 | **B + C4** — mark unmeasured/non-normative content | small | — |
| 3 | **A** — fix distance double-weighting in beam ranking | small | — |
| 4 | **D** — port `suggestTransitionOperators` (dropped by the port) | small | — |
| 5 | **C2** — decouple operator *selection* from the phase portrait | design | C1, D |

1–4 are independent and safe. 5 is the real work and wants its own session.

### A — distance is double-weighted in beam ranking

`src/kernel/solver.ts`. `computeCost` returns
`terminalDistance + β·dissipation + γ·penalty`, and that result is stored as
`costSoFar`. Then:

```ts
estimatedTotalCost: costSoFar + h   // h = distance(newState, target)
```

So the effective ranking key is `2·distance + β·diss + γ·penalty`. Proper A*
wants `g = β·diss + γ·penalty` (accumulated) and `h = distance` (to-go).

Corroborating symptom: beam widths 5 and 12 returned **identical** sequences in
every scenario tested — distance dominates the ranking hard enough that
widening the beam changes nothing.

### B + C4 — mark what is not normative

Two instances of the same defect: unmeasured or parallel-model content
presented as ground truth.

- **B.** `src/assets/formalism.json` declares itself
  `"GROUND TRUTH - COGNITIVE BOOTLOADER SPECIFICATION"`, but `algebra_relations`
  (absorption, triple relations, idempotence) is **never read by the engine** —
  `FormalismDocument` in `src/kernel/formalism.ts` types only `operators` and
  `dissipation_rules`. Under §1 it is not unimplemented spec; it is a *parallel
  descriptive model*. Unmarked, every future reader files the same three phantom
  bugs from §2.
- **C4.** `OPERATOR_EFFECTS` in `src/kernel/phasePortrait.ts` is a simplified
  placeholder inherited from Python (see C1), not measured data. Label it.

### D — port `suggestTransitionOperators`

`phase_portrait.py:112` defines a curated attractor-transition table that the
port dropped entirely. `suggestTransitionOperators` does not exist anywhere in
`src/` or `tests/`.

```python
transition_map = {
    (S_STAR,     J_EQUALS_0): ['Kata', 'Telo', 'Seed', 'Latch'],
    (VOID,       J_EQUALS_0): ['Telo', 'Kata', 'Axis', 'Bind'],
    (J_EQUALS_0, S_STAR):     ['Para', 'Ana', 'Crux', 'Echo'],
    (VOID,       S_STAR):     ['Pro', 'Ortho', 'Weave', 'Seed'],
    (S_STAR,     VOID):       ['Non', 'Meta', 'Vale', 'Fold'],
    (J_EQUALS_0, VOID):       ['Non', 'Vale', 'Flux'],
}
```

Consequently `runDiagnose` (`src/cli-commands/diagnose.ts`) omits the
`Suggested operators:` line its Python original prints. Everything else in
`diagnose` matches: all five problem templates are identical in description,
coordinates, and diagnosis text, and both use beam width 10.

**Two versions exist and they disagree.** `formalism.json`
`phase_portrait.transitions` carries an older 2-operator-per-transition table
with five entries; the Python carries four operators across six entries and its
docstring says "Now includes all 20 operators for richer suggestions". The
`(J=0, VOID)` transition has no JSON counterpart at all. Decide which is
canonical before porting.

`phase_portrait.transitions` is **read by nothing** in `src/` or `tests/` — it
appears only in the JSON asset. It is inert in exactly the way
`algebra_relations` is, and belongs in B's labelling pass if it is not adopted.

### C1 — restore the effects injection point

The Python original takes effects as a parameter:

```python
def simulate_trajectory(self, initial_state, operator_sequence,
                        operator_effects: Dict[str, Tuple[float,float]] = None):
    if operator_effects is None:
        # Default effects (simplified)
        operator_effects = self._default_operator_effects()
```

Source: `recursive-ai-framework/recursive-extraction-engine/compiler/phase_portrait.py`
(~line 160).

The port hardcoded the fallback as a module-level constant and dropped the
parameter. `applyOperator(state, op)` has no way to accept measured effects.
The porting comment ("Ported verbatim from `_default_operator_effects`") is
accurate — it ported the *default* and lost the *seam*.

Proposed: optional effects table on `applyOperator`/`simulateTrajectory`,
defaulting to today's constants. Non-breaking, and it makes C2/C3 testable
instead of hypothetical.

### C2 — decouple operator selection from the phase portrait

**The evidence.** `_default_operator_effects()`'s own docstring states how the
vectors were produced:

> "Operator classes guide effects: A-Constructive (low λ): negative ΔD, ΔC
> (stabilizing); B-Disruptive (high λ): positive ΔD, ΔC (destabilizing)…"

They were **generated from the operator's class, not measured**. That fully
explains the degeneracy measured below: all five A-Constructive operators got
one recipe with hand-jitter.

**Measured degeneracy** (pairwise distance in `(ΔD, ΔC)` space):

```
Seed  ~ Latch    0.010   |Δλ| 0.01     genesis ~ lock
Ortho ~ Axis     0.010   |Δλ| 0.01
Weave ~ Axis     0.010   |Δλ| 0.02
Ana   ~ Flux     0.014   |Δλ| 0.15     the only pair λ separates
Telo  ~ Seed     0.014   |Δλ| 0.03

62 of 190 pairs (33%) are closer than DISTANCE_THRESHOLD (0.12)
33 of 190 pairs are closer than 0.05
```

Operator identity is finer-grained than the solver's own arrival threshold.

**Why this points at selection, not at the vectors.** Every *measured* quantity
in the framework is relational — `torsion_field_analysis.json` (35 torsion
pairs, 17 invariants, 74,250 contradictions), `refined_commutators.json`,
`commutator_skeleton_enhanced.json`, and the composition evidence in
`operator_mapping.json`. **None** contains per-operator `(ΔD, ΔC)`. The only
per-operator numbers in the system — `lambda_intrinsic` and the effect
vectors — are both hand-assigned.

Under §1.1 that is consistent, not broken: a framework built to measure
transitions measures transitions. But it means the phase portrait's
per-operator vectors are the one non-relational artifact in an otherwise
relational system, and the solver uses exactly that data for its
highest-stakes decision.

**Direction:** score trajectories with the phase portrait; select operators
using the relational data that was actually measured.

**A candidate signal already exists.** The transition table in D is a curated,
attractor-keyed, *semantic* selection mechanism that owes nothing to the effect
vectors. Sanity check against the measurements in §4: for the polish case
(S* → J=0) it proposes `Kata, Telo, Seed, Latch` — which includes the solver's
`Latch` but excludes its `Weave`, i.e. it discriminates within the degenerate
cluster on grounds the vectors cannot supply. Note in fairness that it also
lists `Seed` as a stabiliser, so the framework's own author did not treat
`Seed ~ Latch` as absurd; the table is a signal to evaluate, not a ground
truth to adopt uncritically.

### C3 — parked (research, not implementation)

Deriving per-operator effects from torsion data is underdetermined: 35 measured
pairs against 190 operator pairs, and nothing in the framework claims
per-operator displacement is a meaningful quantity in the first place.

---

## 4. Reproduction — the measurements behind this

Target `D=0.15, C=0.10`; identical results at beam width 5 and 12.

| Scenario | Initial | Solver output | J |
|---|---|---|---|
| nearly done | 0.30 / 0.25 | `Weave` | 0.132 |
| typical polish | 0.45 / 0.40 | `Weave → Latch` | 0.371 |
| rough draft | 0.60 / 0.55 | `Weave → Latch → Latch` | 0.610 |
| semantic 8-op sequence | 0.45 / 0.40 | `Axis → Meta → Ana → Ortho → Weave → Kata → Latch → Telo` | 3.069 |

The semantic sequence terminates at `(0, 0)` — clamped to the origin — giving a
terminal distance of 0.180, *worse* than the solver's 0.058. In this model
over-polishing has a signature: overshoot into the clamped corner.

**Control** (the solver is not broken — asked for J=0 → S* it uses disruptive
operators immediately):

```
ideate   J=0 → S*   [Non → Fold]
provoke  J=0 → S*   [Non → Crux → Para → Para]
```

Operator selection is pure vector-fit to the target coordinate: target
`0.12/0.20` yields `Telo → Telo`, target `0.05/0.05` yields `Kata → Kata`.

---

## 5. Loose ends

- `lambda diagnose` **has now been checked** against
  `controlled_rupture_cli.py`. Templates, coordinates, diagnoses and beam width
  all match; the one gap is the missing suggested-operators line — see D.
- `runDiagnose` and `listDiagnoseProblems` (`src/cli-commands/diagnose.ts`)
  have no covering tests.
- The divergence between semantic and solver sequences is currently the only
  place the algebra and the dynamics are observable against each other.
  Patching the engine into agreement destroys the instrument before it has been
  read. Prefer instrumenting over reconciling.
