# Build plan — the algebra/dynamics seam

Status: planned, not implemented. Nothing here has been built.

Companion to the findings in
[docs/suggestions/algebra-vs-dynamics-backlog.md](../suggestions/algebra-vs-dynamics-backlog.md)
(a suggestion — see [that directory's NOTICE](../suggestions/NOTICE.md)).
The backlog says *what* and *why*; this says *in what order, touching which
files, verified how, and what breaks*.

---

## 0. What was verified before planning

Every claim below was checked against the working tree, not assumed.

| Backlog claim | Verdict |
|---|---|
| `computeCost` result is stored as `costSoFar`, then `+ h` again | **Confirmed** — `src/kernel/solver.ts:145-152` |
| Beam 5 and 12 return identical sequences | **Confirmed** on the §4 scenarios; also identical on 4 of 5 `diagnose` templates |
| `suggestTransitionOperators` absent from `src/` and `tests/` | **Confirmed** |
| Python source still reachable for the port | **Confirmed** — `recursive-ai-framework/recursive-extraction-engine/compiler/phase_portrait.py:112` |
| `algebra_relations` unread by the engine | **Confirmed** — `FormalismDocument` (`src/kernel/formalism.ts:18-21`) types only `operators` + `dissipation_rules` |
| `phase_portrait.transitions` read by nothing | **Confirmed** |
| `runDiagnose` / `listDiagnoseProblems` untested | **Confirmed** — no test file references either |

### Three corrections to the backlog

1. **B is already half-done.** `src/assets/NOTICE.md` item 4 already states that
   `algebra_relations` and the per-operator declarative fields are never read,
   and enumerates the fields that *are* read. The gap is narrower than the
   backlog implies: what remains unmarked is (a) `metadata.status`
   (`"GROUND TRUTH - COGNITIVE BOOTLOADER SPECIFICATION"`) still asserting
   normativity from inside the file itself, (b) `phase_portrait.transitions`,
   which NOTICE.md does not mention at all, and (c) `OPERATOR_EFFECTS`
   (`src/kernel/phasePortrait.ts:14`), whose comment says "Ported verbatim" —
   true, and precisely the sentence that misleads, since it certifies porting
   fidelity while saying nothing about provenance.

2. **A has a blast radius the backlog does not name.** `solve()` feeds
   `planTask` (`src/engine/core.ts:342`), which builds every non-HALIRA `Plan`.
   Changing the ranking changes emitted plans, `lambda solve` output, and
   `lambda diagnose` output. It also risks the ported-Python parity test
   (`tests/kernel/solver.test.ts:13-26`, pinning `cost === 0.675`) if `cost`
   is redefined along with the ranking key. **These must stay separate:** the
   reported objective *J* keeps its current definition (Python parity), and only
   the frontier ordering changes.

3. **A's effect is measured, not hypothetical.** A prototype of the corrected
   ranking (`g = β·dissipation + γ·penalty`, `h = distance`, `J` reported
   unchanged) was run against the current solver across the §4 scenarios and all
   five `diagnose` templates:

   | Case | Current | Corrected | J current → corrected |
   |---|---|---|---|
   | nearly / polish / rough | unchanged | unchanged | unchanged |
   | Python parity (0.6,0.6)→(0.2,0.2) | `Kata Kata` | `Kata Kata` | 0.6750 → 0.6750 |
   | rigid, procrastinating | unchanged | unchanged | unchanged |
   | stuck (bw 10) | `Kata Weave Latch` | `Axis Telo Telo` | 0.7840 → **0.7654** |
   | overwhelmed (bw 10) | `Weave Latch ×4 Telo Flux` | `Axis Telo ×6 Flux` | 1.7001 → **1.6521** |
   | collapsed (bw 10) | `Kata Kata Weave` | `Kata Weave Latch` | 0.8284 → **0.8179** |

   Two things follow. The parity test survives untouched — the fix is *not* a
   ported-behaviour break. And wherever the answer changes, it changes to a
   **lower J under the unchanged objective**: the current ranking was losing
   solutions its own cost function prefers. Beam width also starts to matter
   again (`stuck` diverges between bw 5 and bw 12), which retires the backlog's
   corroborating symptom. Note `overwhelmed` gets *longer* (7 → 8 operators)
   while scoring better; length is not in the objective, and this plan does not
   add it.

---

## Phase 0 — characterization before anything moves

Nothing in Phase 1 is safe without this. The solver has one parity test and
four behavioural ones; `diagnose` has none.

- **0.1** `tests/kernel/solver.test.ts` — add a characterization block pinning
  the current sequence, `cost`, and `finalState` for the five `diagnose`
  templates at beam width 10 and for the §4 scenarios at beam widths 5 and 12.
  Mark it explicitly as *characterization, expected to change in Phase 1*, with
  the before/after table above referenced by path.
- **0.2** `tests/cli-commands/diagnose.test.ts` (new) — cover `runDiagnose`
  (each template key, `--json` and human output, unknown key → exit 1) and
  `listDiagnoseProblems`. Closes the §5 loose end and is the regression net for
  Phase 3's new output line. `runDiagnose` calls `process.exit`, so drive it
  through the built CLI the way `tests/cli.test.ts` does rather than importing it.
- **0.3** Record `planTask`'s emitted sequence for a fixed `PlanRequest` in
  `tests/engine.test.ts`, so Phase 1's plan-level effect is visible rather than
  inferred.

**Acceptance:** `npm test` green; every Phase 1 behaviour change shows up as a
named failing assertion rather than a silent diff.

---

## Phase 1 — A: separate the ranking key from the objective

Single file: `src/kernel/solver.ts`.

- **1.1** Split the two quantities that are currently conflated:
  - `objective(sequence, state, target) = distance + β·dissipation + γ·penalty`
    — unchanged, reported as `cost` / `costBreakdown.total`, keeps Python parity.
  - `g(sequence, state) = β·dissipation + γ·penalty` — accumulated-cost half.
  - `estimatedTotalCost = g + h`, `h = distance(state, target)`.

  Dissipation is a whole-path total (`totalDissipationCost` sums *n−1*
  transitions), so recomputing `g` per node stays correct; no incremental
  accumulator is needed.
- **1.2** Keep `SolveResult` shape byte-identical. `cost` remains *J*. If a
  ranking value is wanted for debugging, add it as a new optional field —
  do not repurpose an existing one.
- **1.3** Comment the seam: state that `g + h` is the A* ranking and `J` is the
  reported objective, and that they are deliberately different functions.
- **1.4** Update the Phase 0 characterization tests to the new expected values,
  in the same commit, with the J-improvement column in the message.

**Acceptance:** parity test unchanged and green; every changed case shows
`J_new ≤ J_old`; beam width 5 and 12 no longer agree on `stuck`.

**Risk:** emitted `Plan`s change for high-D/C initial states. Mitigated by 0.3.
**Not in scope:** adding a length term to the objective.

---

## Phase 2 — B + C4: mark what is not normative

No behaviour change. Three edits and one doc.

- **2.1** `src/assets/formalism.json` — the file asserts its own normativity via
  `metadata.status`. Two options, pick one and apply consistently:
  *(a)* leave the JSON byte-identical (it is a copied asset; NOTICE.md exists
  precisely so copies stay verbatim) and extend NOTICE.md instead; *(b)* add a
  sibling `metadata.engine_note` field. **Recommend (a)** — it preserves the
  "copied verbatim, corrections live in NOTICE" invariant the file already
  documents, and avoids a diff against the upstream version pin.
- **2.2** `src/assets/NOTICE.md` — add item 6 covering
  `phase_portrait.transitions`: inert, contradicted by the richer Python table
  (see Phase 3), superseded rather than authoritative. Extend item 4 to say
  `algebra_relations` is a *parallel descriptive model over function-composition*,
  not unimplemented spec — with a pointer to backlog §1–2 so the three phantom
  bugs are not re-filed.
- **2.3** `src/kernel/phasePortrait.ts:14` — replace the "Ported verbatim"
  comment with one that keeps the porting claim *and* states provenance: the
  vectors were generated from operator class (A-Constructive → negative Δ,
  B-Disruptive → positive Δ) with hand jitter, are not measured, and are a
  placeholder pending C1/C2.
- **2.4** `docs/CURRENT_STATE.md` / `docs/REQUIREMENTS_MATRIX.md` — the matrix
  already hedges phase-portrait values as "not calibrated from observed agent
  outcomes"; tighten to name the class-generated provenance.

**Acceptance:** no test change; a reader landing on `formalism.json` or
`OPERATOR_EFFECTS` reaches the provenance note without leaving the file.

---

## Phase 3 — D: port `suggestTransitionOperators`

**3.1 Resolve the canonical table first — this is a decision, not a port.**
Two tables disagree:

| | `formalism.json` `phase_portrait.transitions` | `phase_portrait.py:112` |
|---|---|---|
| entries | 5 | 6 (adds `J=0 → ∅`) |
| ops per entry | 2 | 3–4 |
| read by anything | no | yes — `controlled_rupture_cli.py:107` |

**Recommend the Python table**, because it is the one that actually produced
the output this port is missing, it is a strict superset, and its docstring
records intent ("all 20 operators for richer suggestions"). The JSON table then
falls under Phase 2.2's labelling pass as superseded.

- **3.2** `src/kernel/phasePortrait.ts` — add
  `suggestTransitionOperators(from: AttractorLabel, to: AttractorLabel): readonly Operator[]`,
  keyed on the existing `AttractorLabel` union (`"J=0" | "S*" | "∅"`), returning
  `[]` for unmapped pairs including same-attractor pairs. Export from
  `src/kernel/index.ts`.
- **3.3** `src/cli-commands/diagnose.ts` — print `Suggested operators: …` between
  the attractor line and the solution, and add a `suggested` field to the JSON
  branch. Suppress the line when the list is empty, matching
  `controlled_rupture_cli.py:108`.
- **3.4** Tests — table content per pair; `[]` for unmapped. Note that
  `procrastinating` is **S\* → S\*** (target `(0.25, 0.20)` gives V = 0.33, which
  is *not* < 0.3), so it exercises the empty-suggestion branch for free; the
  other four templates each hit a mapped pair.
- **3.5** `docs/CLI_REFERENCE.md` — document the new line and JSON field.

**Acceptance:** all five templates' `diagnose` output matches the Python CLI's
for the suggestion line; `lambda diagnose --json` gains `suggested` without
changing existing keys.

**Ordering note:** 3.1 is a call the operator should make before 3.2 is written.

---

## Phase 4 — C1: restore the effects injection point

`src/kernel/phasePortrait.ts`, non-breaking.

- **4.1** `export type OperatorEffects = Readonly<Record<Operator, readonly [number, number]>>`;
  export the current constant as `DEFAULT_OPERATOR_EFFECTS`.
- **4.2** Optional trailing parameter on `operatorEffect`, `applyOperator`, and
  `simulateTrajectory`, defaulting to `DEFAULT_OPERATOR_EFFECTS`. Every existing
  call site (`solver.ts:143`, `session.ts:48`, `analyze.ts:38`) keeps compiling
  untouched.
- **4.3** Thread an optional `effects` through `SolveOptions` so an alternative
  table can be evaluated end-to-end. This is the point of the phase — a seam
  nothing can reach is the defect being fixed.
- **4.4** Tests: default path identical to today; an injected table changes the
  trajectory as specified.

**Acceptance:** zero call-site changes required; C2/C3 become runnable
experiments instead of thought experiments.

**Deliberately excluded:** `session.ts` currently owns real kernel state. Do not
expose effects injection through the *session* API in this phase — a session
whose physics can be swapped per call is a different design question.

---

## Phase 5 — C2: decouple selection from the phase portrait (own session)

Design work, gated on Phases 3 and 4. **The backlog's §5 constraint governs:
instrument before reconciling.** The divergence between the semantic and solver
sequences is currently the only place the algebra and the dynamics are
observable against each other; a change that makes them agree destroys the
measurement.

Proposed order inside that session:

- **5.1 Instrument.** A degeneracy report — the 190 operator pairs by `(ΔD, ΔC)`
  distance and `|Δλ|`, reproducing the backlog's 62/190 and 33/190 counts as a
  test-pinned fixture. It becomes the metric any later change is judged against,
  and it is worth building even if 5.3 is never adopted.
- **5.2 Compare, do not replace.** With Phase 4's seam, run the solver with the
  Phase 3 transition table as a *candidate filter* on the operator set and diff
  the sequences against today's. Report both; adopt neither yet.
- **5.3 Decide.** Only then choose whether selection consults the relational
  data and scoring keeps the phase portrait. The backlog's own caution stands:
  the table lists `Seed` as a stabiliser, so it is a signal to evaluate, not a
  ground truth.

**C3 stays parked.** 35 measured torsion pairs against 190 operator pairs is
underdetermined, and nothing in the framework claims per-operator displacement
is meaningful.

---

## Sequencing

```
Phase 0  characterization ─┬─> Phase 1  A (solver ranking)
                           └─> Phase 3  D (transition table)   [3.1 = a decision]
Phase 2  labelling  — independent, no dependencies, ship any time
Phase 4  C1 (effects seam) — independent of 1/2/3
Phase 5  C2 — requires 3 and 4
```

Phases 2 and 4 can land in parallel with 0/1. Phase 3 needs 0.2 (diagnose tests)
before it changes `diagnose` output. Phase 1 needs all of Phase 0.

One commit per phase, conventional-commit style; Phase 1's message carries the
J-improvement table so the behaviour change is reviewable from the log.

## Out of scope

- Adding sequence length to the solver objective.
- Enforcing `algebra_relations` (idempotence, absorption, `Telo` terminality) in
  the engine — backlog §2 withdrew all three, and §1's two decisions ground the
  withdrawal.
- Correcting the upstream inconsistencies in `src/assets/NOTICE.md`; they are
  pinned by characterization test on purpose.
- Deriving per-operator effects from torsion data (C3, parked).
