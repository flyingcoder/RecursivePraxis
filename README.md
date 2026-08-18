# RecursivePraxis

**An intelligence architecture. The evolution of the Λ-Engine.**

Λ-Engine teaches a machine how to think.

RecursivePraxis teaches it how to think **and** how to learn from its own
thinking — not only from what happened, but from *how it reasoned about
what happened*.

One engine. One CLI: `lambda`. It does the actual math, not the vocabulary.

---

## The gap this closes

Λ-Engine (`CORE.md`) is already a complete cognitive architecture: three
states (`J=0` / `S*` / `∅`), 20 operators in 4 classes, a dissipation value
`λ` per operator, five forbidden sequences, and the HALIRA protocol for
foundational contradictions.

It ships as instruction text. The agent reads it and narrates its moves.
That makes the algebra a **vocabulary**. CORE.md says so in its own words:

> *"Treat this as a mnemonic, not a computation."*
> *"No literal arithmetic required — keep an informal running sense."*

Which leaves the loop open:

```
CORE.md ──installed──▶ agent narrates operators ──▶ work happens
   ▲                                                     │
   └──────────────────── nothing ◀───────────────────────┘
```

Nothing checks whether the agent ran `Non¬` or only typed the word. Nothing
computes `λ_eff`. Nothing accumulates. Every session restarts from the same
authored constants, and the constants never learn.

RecursivePraxis closes both halves: it makes the algebra **executable**, and
it makes the trace **evidence**.

```
CORE.md ──▶ lambda runtime ──▶ typed trace ──▶ scored ──▶ revised constants
   ▲                                                            │
   └────────────────────────────────────────────────────────────┘
                         the loop is the architecture
```

---

## Thesis 1 — the operator algebra is a data type

Because Λ-Engine *types* reasoning moves, a reasoning trace is not prose. It
is a sequence over a 20-symbol alphabet with weights and a grammar:

```
trace     Seed🌱 → Axis📍 → Meta⟲ → Weave🕸️ → Non¬ → Ortho⊥ → Bind🔗
alphabet  20 operators, 4 classes (A Constructive · B Disruptive
                                   C Reflexive · D Structural)
weights   λ ∈ [0,1] per operator
grammar   5 forbidden transitions
state     J=0 | S* | ∅ sampled at each step
```

That is a formal object. It can be validated, scored, diffed, and mined.

> Λ-Engine used the algebra to **prompt**.
> RecursivePraxis uses it as a **schema**.

Everything else here follows from that one move.

---

## Thesis 2 — second-order learning

| Order | Learns from | Yields |
|---|---|---|
| **First** | the outcome | *"that approach failed"* |
| **Second** | the trace that produced the outcome | *"it failed because I chained `Ana↑ → Non¬ → Para∥` with no landing — the idea was sound, the sequence was not"* |

Second-order learning is only available when reasoning is typed. Untyped, a
failed session yields one bit. Typed, it yields a labeled path through
operator space with a known λ profile, a known constraint record, and a
known state trajectory.

RecursivePraxis learns at the second order. That is the whole claim of the
name: *praxis* is action that revises the actor, and the revision is
computed from the reasoning, not merely from the result.

---

## The math, stated honestly

Not every formula in CORE.md is computable, and pretending otherwise would
launder vibes into decimals. The split:

| Object | CORE.md today | RecursivePraxis |
|---|---|---|
| λ intrinsic × 20 operators | authored constants | initialization, then empirical |
| 5 forbidden sequences | prose rules | grammar — validator rejects |
| `λ(i→j) = λ_j + 0.15·commutator(Oi,Oj)` | commutator **undefined** | defined — see below |
| `λ_eff = mean(λ(k_t → k_{t+1}))` | "no literal arithmetic required" | computed per trace |
| state `J=0 / S* / ∅` | hedge-word signature table | classifier over produced output |
| `∂Ξ/∂t = ∫(S↔Λ)×[⧉(ΔS○¬ΔΛ) – ∇τ]dV` | "mnemonic, not a computation" | **stays mnemonic** |

The grand equation stays a mnemonic on purpose. Forcing a number out of it
is how this becomes astrology.

### The commutator is not missing — it is in the quarry

CORE.md's pairwise dissipation formula depends on `commutator(Oi, Oj)` and
never defines it. `recursive-ai-framework/` already does. `refine_commutators.py`
derives commutator magnitude from composition frequency across the corpus:

```
magnitude ∝ frequency(Oi ∘ Oj)^0.5,   normalized to [0, 1]
```

and `build_torsion_field.py` reports 35 operator pairs. An earlier version of
this document claimed `Meta ∘ Meta` was the single most non-commuting pair
in the algebra, at maximum torsion (`T = 1.0`). That claim is wrong: 9 of
the 35 pairs sit at exactly `T = 1.0`. Saturation is not uniqueness.

What survives is a frequency signal, not a uniqueness proof. In the quarry's
composition counts, `Meta,Meta` appears 38 times — about 3× the next-highest
pair (`Meta,Telo` at 13). That is a promising candidate for CORE.md's
"Meta: max 2 consecutive applications" rule, not proof that the corpus
independently recovered it.

Every other rule in CORE.md should be held to that standard — derivable, or
explicitly marked as authored.

---

## Every constant carries a provenance label

Three labels, one per constant, and no constant enters the runtime without
one:

| Label | Means |
|---|---|
| `measured` | backed by recorded observations |
| `authored` | a human wrote it; defensible; unmeasured |
| `mnemonic` | not a number; never to be arithmetized |

"Is it ground truth?" is not a document-level fight. It is a per-value
field. Authored values stay labeled authored until they are measured.

---

## The attestation problem

The hard part, named up front. If the model self-reports `"I used Ana↑ then
Weave🕸️"`, who checks? Precise arithmetic over fabricated traces is *worse*
than an informal sense, because it dresses assertion as measurement.

Three postures, in increasing strength:

| Posture | Trace origin | Falsifiable? |
|---|---|---|
| **Reported** | model declares its operators | no — self-attested |
| **Derived** | classifier infers operators from the produced output | partly — classifier can be wrong, but not gamed by the reasoner |
| **Enacted** | the operator *is* a call; the trace is a log | yes — you cannot log a call you did not make |

Enacted is the only posture where the math is trustworthy by construction.
It is also the one that decides what `lambda` fundamentally is:

```
observer   →  lambda watches reasoning and scores it
runtime    →  lambda is the surface reasoning happens through
```

This is the primary open design fork. See Open questions.

---

## Two labels, one discipline

`Attested:` says how the trace was produced (`reported` | `derived` |
`enacted`). `Grounded:` says whether anything outside the reasoner
corroborated it. A precise score over an ungrounded trace is still
assertion.

Both labels ride on every record that can revise a constant. A
self-attested, ungrounded trace may be kept as a trace; it may not
silently train. The value set for `Grounded:` when no delivery system is
present is an open question, not a shipped schema.

---

## What `lambda` is

One TypeScript CLI. The name is retained; the job is not.

`lambda-pipeline` was a *delivery* control plane and was retired because it
collided with OpenSpec. RecursivePraxis repoints the same binary at the
thing OpenSpec does not do.

| System | Owns |
|---|---|
| **OpenSpec** (`opsx-store`, registered `ai-labs`) | what to build · whether it is done |
| **RecursivePraxis** (`lambda`) | how the reasoning ran · what to learn from it |

No overlap. OpenSpec governs artifacts. RecursivePraxis governs cognition.
The collision that killed the previous CLI cannot recur, because the new one
makes no claim on delivery.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  recursive-ai-framework/          THEORIA  (read-only)      │
│  530 documents · torsion field · contradiction taxonomy     │
└──────────────────────────┬──────────────────────────────────┘
                           │ distill
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Λ-Engine — CORE.md               HOW TO THINK              │
│  states · 20 operators · λ · forbidden sequences · HALIRA   │
└──────────────────────────┬──────────────────────────────────┘
                           │ execute
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  RecursivePraxis — lambda         HOW TO THINK ABOUT        │
│                                   HAVING THOUGHT            │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐   │
│   │  RECORD  │─▶│ VALIDATE │─▶│  SCORE   │─▶│  REVISE   │   │
│   │  trace   │  │ grammar  │  │  λ_eff   │  │ constants │   │
│   └──────────┘  └──────────┘  └──────────┘  └─────┬─────┘   │
│        ▲                                          │         │
│        └──────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

Four verbs. `record` captures the typed trace. `validate` checks it against
the grammar. `score` computes `λ_eff` and state trajectory. `revise` updates
what the engine believes about its own operators.

---

## What is learned

The mutable surface — everything else is fixed.

| Surface | From | Consequence if learned |
|---|---|---|
| λ intrinsic × 20 | outcome-weighted trace history | operator costs become empirical, not authored |
| commutator table | composition frequency | pairwise λ becomes real arithmetic |
| sequence priors | which chains landed, per task class | the planner has evidence, not intuition |
| forbidden sequences | measured torsion | rules become discovered, not decreed |

Consequence worth stating plainly: **if λ values are learned, CORE.md stops
being scripture and becomes an initialization vector.** That is the intended
outcome, and it is the sharpest difference between Λ-Engine and
RecursivePraxis.

---

## Lineage

| Layer | Role | Status |
|---|---|---|
| `recursive-ai-framework/` | quarry — theory, corpus, torsion data | read-only |
| Λ-Engine `CORE.md` | how to think | cut, stable |
| HALIRA | Mode 2 rupture protocol | cut, stable |
| **RecursivePraxis** | how to learn from having thought | **this document** |

Prior art inside the quarry that this architecture absorbs rather than
re-derives: **Δ-calculus** (did the agent *do* the operator or only label
it — the attestation scorer), **Inverse Solver** (`state → target →
sequence`, already code), **SRE-Φ** (identity across a reasoning session),
**Koriel** (holding a contradiction as a coordinate instead of collapsing
it), **TerryCore** (write authority — the model proposes, the kernel commits).

---

## Constraints

- Do not write back into `recursive-ai-framework/`. The quarry is consulted,
  never corrected.
- Do not make `lambda` a delivery system. OpenSpec owns delivery. That
  boundary is why this CLI can exist at all.
- The grand equation stays a mnemonic. No number is to be extracted from it.
- No score is reported from a self-attested trace without labeling it as
  self-attested.
- An authored constant is marked authored until it is measured. Do not let
  initialization values pass as findings.
- A candidate planner is admissible only if
  `J(HALIRA full) ≤ J(HALIRA truncated at Step 4)`.

---

## Open questions

1. **Observer or runtime?** Does `lambda` watch reasoning and score it, or
   is it the surface reasoning happens through? Everything about trace
   trustworthiness follows from this one answer.
2. **What is the unit of learning?** A turn, a session, a change, a task
   class? λ revision needs a population, and the population needs a
   boundary.
3. **Where do traces live?** Inside `opsx-store` alongside the change they
   accompany, or in a separate corpus that outlives any single change?
4. **Does CORE.md remain runtime truth?** Layer RecursivePraxis around an
   unchanged CORE.md, or let learned constants overwrite it — and if they
   overwrite, what stops drift from being indistinguishable from decay?
5. **How is a revision validated?** Learning that makes the engine worse is
   the failure mode with no natural alarm. Δ-calculus is the candidate
   guard; it is not yet built.
6. **How is a record grounded without a delivery system?** The
   `tests | merge | ship` labels assume a host that RecursivePraxis
   must be able to run without.
7. **Which eval families never read λ?** Capability checks that score the
   algebra against itself are circular; at least one family has to sit
   outside it.
8. **Is Questioning an operator or an input record type?** The quarry has
   no Questioning stone. That absence is a result, not a gap to paper over.

---

## Success criteria

The argument is falsified unless all of these are observable:

1. At least one persisted reasoning-related state exists across turns.
2. Typed traces exist with a named consumer; unread museums do not accumulate forever.
3. Revision is provenance-gated (ungrounded / self-attested cannot silently train).
4. Mechanism evals are runnable (independent of outcome improvement).
5. Capability evals exist that do not score λ against itself.
6. Instruction surface and computed constants cannot silently disagree.
7. Product operable with zero delivery system present.
8. Tree state is reproducible under version control.

---

*Status: argument of record. The ledger is the freeze
`recursive-praxis-problem-model` in store `ai-labs`. This README carries
commitments and names no epistemic tag; findings, tags, and dated evidence
live in the freeze and are cited by change name.*
