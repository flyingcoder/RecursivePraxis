# The algebra/dynamics seam

Status: **current behaviour.** This is a record of work that has landed, not a
plan. It supersedes `docs/plans/algebra-vs-dynamics-build-plan.md` and
`docs/suggestions/algebra-vs-dynamics-backlog.md`, both of which were deleted
once their contents were built; the parts still cited from code and tests are
carried here.

---

## 0. The finding in one line

The formalism is an **algebra over operators** (composition, absorption,
idempotence). The engine is a **dynamical system over states** (additive
`(ΔD, ΔC)` displacement, summed transition costs). Neither is wrong. What was
missing was a specified relationship between them — and three things that
looked like bugs were that seam showing through.

## 1. Two decisions that ground everything below

Both are settled. If either is revisited, everything in §2 must be re-derived.

1. **λ is a property of transitions**, not of moves.
2. **Operators are displacements**, not functions.

## 2. Withdrawn — do not re-file these

All three were category errors that dissolve under §1. They are recorded so the
next reader does not rediscover and "fix" them.

| Apparent bug | Why it is not one |
|---|---|
| The first operator is free (`totalDissipationCost` returns 0 for length < 2) | λ is a transition property; *n* operators have *n−1* transitions. A single-operator sequence has nothing to dissipate along. Correct as written. |
| Idempotence is unenforced (`Kata → Kata` descends twice) | `Kata² = Kata` describes composition of *functions*. Operators are displacements. Repeating one legitimately displaces twice. |
| `Telo` has no terminal privilege | `X ∘ Telo = Telo` is an absorption law in function-space. It makes no claim about displacement ordering. |

Residue from the first row: the free opening move is *correctly* priced at zero,
but it means the first operator is selected with no λ signal at all. That is a
gap in the objective, not in the cost function, and it is still open.

## 3. What was built

### The A\* ranking (`src/kernel/solver.ts`)

The solver ranked its frontier by `J + h`, where `J` already contained the
terminal distance — so distance was counted twice and sequences `J` itself
scored better were discarded. The frontier now ranks by `g + h`: `g` is the
already-paid cost (dissipation + attractor penalty), `h` the distance to go.

`J` is **not** redefined. It remains the reported `cost`, and the Python parity
test still pins `0.675`. The measured effect on the five `diagnose` templates:

| Case | Before | After | J |
|---|---|---|---|
| stuck | `Kata Weave Latch` | `Axis Telo Telo` | 0.7840 → **0.7654** |
| overwhelmed | `Weave Latch ×4 Telo Flux` | `Axis Telo ×6 Flux` | 1.7001 → **1.6521** |
| collapsed | `Kata Kata Weave` | `Kata Weave Latch` | 0.8284 → **0.8179** |
| rigid, procrastinating | unchanged | unchanged | unchanged |

Every changed case moved to a strictly lower J under the unchanged objective:
the old ranking was losing solutions its own cost function preferred. A side
effect is that beam width is a live parameter again — the doubled distance term
had flattened the frontier enough that widths 5 and 12 agreed everywhere.

Pinned by `tests/kernel/solver.test.ts`.

### The suggestion table (`src/kernel/phasePortrait.ts`)

`suggestTransitionOperators` is ported from `phase_portrait.py`, restoring the
`Suggested operators:` line to `lambda diagnose`. Two upstream tables disagreed;
the Python one is a strict superset and the one the upstream CLI actually read,
so `formalism.json` → `phase_portrait.transitions` is labelled superseded rather
than authoritative (`src/assets/NOTICE.md` item 7).

### The injection seams (`SolveOptions`)

`effects` swaps the per-operator displacement table; `candidates` swaps the
operator alphabet the search expands. Both default to today's behaviour and
nothing in the engine passes either. They exist so a replacement physics or a
replacement selection rule is an experiment rather than an edit to the kernel.

The `effects` seam reaches the search only. `session.ts` `step` and the
`analyze` command still advance state with the default table, so a sequence
solved under an injected table will not be *stepped* under it. Widening it to
those call sites is unbuilt: a session whose physics can be swapped per call is
a different design question.

## 4. Degeneracy — what the effects table can distinguish

`DEFAULT_OPERATOR_EFFECTS` is generated from operator class with hand-chosen
magnitudes and is calibrated against nothing. `degeneracyReport`
(`src/kernel/degeneracy.ts`) measures what that costs:

```
62 of 190 pairs closer than the arrival threshold (0.12)
33 of 190 closer than 0.05

  Seed ~ Latch      0.010   |Δλ| 0.01     genesis ~ lock
  Axis ~ Latch      0.010   |Δλ| 0.02
  Ortho ~ Axis      0.010   |Δλ| 0.01
  Weave ~ Axis      0.010   |Δλ| 0.02
  Ana ~ Flux        0.014   |Δλ| 0.15     the only pair λ separates
```

Operator identity is finer-grained than the distance the solver treats as
arrival. For a third of the alphabet, "which operator" is settled by rounding
rather than by meaning.

Why this points at *selection* rather than at the vectors: every measured
quantity in the framework is relational — torsion pairs, commutators,
composition evidence — and **none** contains per-operator `(ΔD, ΔC)`. The only
per-operator numbers in the system, `lambda_intrinsic` and the effect vectors,
are both hand-assigned. Under §1.1 that is consistent rather than broken, but it
means the phase portrait's vectors are the one non-relational artifact in an
otherwise relational system, and the solver uses exactly that data for its
highest-stakes decision.

Pinned by `tests/kernel/degeneracy.test.ts`. Any replacement effects table is
judged against these numbers.

## 5. The transition table as a selection filter — measured, not adopted

The open question was whether a *semantic* selection mechanism that owes nothing
to the effect vectors picks better operators inside those degenerate clusters.
The attractor transition table is the one such signal already in the system, so
`compareTransitionFilter` (`src/kernel/selectionStudy.ts`) runs the solver twice
per problem — full alphabet, then restricted to the table's operators for the
initial→target pair — and scores both by the unchanged J.

| Case | Full | Restricted | Verdict |
|---|---|---|---|
| nearly done | `Weave` | `Latch` | worse, +10.3% |
| collapsed | `Kata Weave Latch` | `Weave ×3` | worse, +8.1% |
| rigid | `Non Crux` | `Para Para` | worse, +7.0% |
| stuck | `Axis Telo Telo` | `Seed ×3` | worse, +4.9% |
| typical polish | `Weave Latch` | `Latch Latch` | worse, +3.7% |
| rough draft | `Weave Latch Latch` | `Latch ×3` | worse, +2.3% |
| python parity | `Kata Kata` | `Kata Kata` | identical |
| overwhelmed | `Axis Telo ×6 Flux` | `Kata Latch ×3` | **never arrives** |
| procrastinating | `Kata Kata` | — | unmapped (S\* → S\*) |

**Decision: the table is not wired into selection.** It never wins. Two things
make that more than a scoreboard:

- **The failure is structural, not incidental.** `suggestTransitionOperators` is
  keyed on the *initial* attractor, so the candidate set is fixed for a search
  whose state crosses attractor boundaries as it runs. `overwhelmed` therefore
  gets an all-stabiliser set, overshoots to `D = 0.09` against a target of
  `0.20`, and has nothing in its alphabet that can come back. Note the trap this
  case sets: its J is 39% *lower* than the successful full search, because a
  path that stops short stops paying dissipation. J does not contain arrival, so
  arrival is checked first — see `TransitionFilterVerdict`.
- **It is nonetheless not noise.** On `typical polish` the full search picks
  `Weave` and the table picks `Latch` — two operators 0.014 apart, which is to
  say the same operator as far as the effect vectors are concerned. The table
  discriminates inside a degenerate cluster on grounds the vectors cannot
  supply, and it costs 3.7% of J to do it.

So the table stays what it is: a suggestion surface that `lambda diagnose`
prints, and a signal worth re-testing rather than a ground truth. It also
contradicts itself as data — it lists `Seed` as both a stabiliser (`S*`→`J=0`)
and an activator (`∅`→`S*`).

What would reopen this: a filter recomputed per node rather than fixed at the
initial attractor, or an effects table measured well enough that the two
mechanisms stop disagreeing about which operators are alike. Both are experiments
the `candidates` and `effects` seams already support.

Pinned by `tests/kernel/selectionStudy.test.ts`.

## 6. Still open

- **The wider C2 question is not settled.** "Select operators from relational
  data, score trajectories with the phase portrait" was tested against the one
  relational signal available in the right shape, and that signal lost. The
  commutator and torsion data remain unevaluated for this purpose.
- **Deriving per-operator effects from torsion data is parked.** 35 measured
  torsion pairs against 190 operator pairs is underdetermined, and nothing in
  the framework claims per-operator displacement is a meaningful quantity in the
  first place.
- **Sequence length is not in the objective**, deliberately. `overwhelmed` gets
  *longer* under the corrected ranking (7 → 8 operators) while scoring better.
- **`algebra_relations` is not enforced** and should not be — see §2.
- **The upstream inconsistencies in `src/assets/NOTICE.md` are not corrected.**
  They are pinned by characterization test on purpose.
