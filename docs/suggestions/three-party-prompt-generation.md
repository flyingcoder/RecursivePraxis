# Suggestion — a three-party protocol for writing the meta-prompt

Status: suggestion. Nothing here is implemented, and nothing here is decided —
see [NOTICE.md](NOTICE.md). Every name in this document (this **filename**
included), every path, every command spelling, and every constraint id is a
placeholder written as `<…>` or marked *provisional*. Choosing them is a later
act, and one this document deliberately declines to perform.

This responds to
[operator-sequence-to-execution-language.md](operator-sequence-to-execution-language.md)
and picks up the same step 4 of
[suggested-human-ai-lambda-flow.md](suggested-human-ai-lambda-flow.md) — but
from the side that document leaves empty: **the human**.

---

## 1. Evaluation of the existing suggestion

### 1.1 What holds

The load-bearing idea is right and is already prototyped: split every
instruction field by **who may author it**, let the kernel compute everything
it can, and reduce the model's output surface to a few slots. A model that
*applies* vocabulary it cannot *invent* is a genuinely different risk profile
from a model handed a bare sequence and asked to write prose.

Four things in that document survive contact with the code:

| Section | Claim | State |
|---|---|---|
| §1 | kernel-authored vs model-authored split | real — [execution.ts](../../src/ir/execution.ts), [schemas.ts](../../src/adapters/schemas.ts) |
| §0/§5 | solver trajectories are degenerate; normalize first | real — [normalize.ts](../../src/ir/normalize.ts), coverage flag verified below |
| §8 | a rejected sequence is not repaired by rewriting | real — `compileExecutionProgram` throws |
| §7 | model-authored values are `inferred`, never `measured` | real — `BindingProvenance`, consistent with [VOCABULARY.md](../VOCABULARY.md) |

### 1.2 Six gaps

**A. The human appears exactly once, as a quoted span.** The pipeline is
human → agent → kernel → agent → prose. Every field the model authors —
`domainBinding`, `exitTest` — is a *decision about someone else's problem*,
made without them. §6 requires citing the input, but a citation is not a
confirmation: quoting a span the human wrote does not establish that the model
read it correctly. An `exitTest` in particular is an acceptance criterion, and
an acceptance criterion authored by the party being accepted is not one.

**B. §6's anti-hallucination rule is syntactic only.** This was checked against
this checkout, not inferred:

```sh
$ cat bindings.json
{"0":{"domainBinding":"x",
      "evidenceRefs":[{"id":"span:99","kind":"input","hash":""}],
      "exitTest":"y"}}

$ lambda compile "Axis,Crux,Ana,Meta,Para,Weave,Kata,Bind" --bindings bindings.json
### 0. ⊢ Axis — Orienting axis, framing
- binding (inferred): x
- evidence: span:99
- exit test: y
```

`span:99` does not exist. The hash is the empty string. Both were accepted and
rendered as a fact of the program. The reason is a seam: `evidenceRefSchema`
types `hash` as `z.string()`, while the runtime ingress in
[orchestrator.ts](../../src/engine/orchestrator.ts) enforces
`HASH_PATTERN = /^[a-f0-9]{64}$/i`. The compile path is the looser of the two.

The deeper problem is not the regex. It is that **there is no span table** —
nothing in the repo turns human input into ids with subjects, so there is
nothing for a hash to be a hash *of* and no set for an id to be checked
against. §6's rule cannot be enforced until some party authors that table, and
the obvious authority on what a span of the human's own words means is the
human.

**C. The sequence arrives without provenance.** `lambda compile` takes a
sequence as an argv string and never reads the session
([compile.ts](../../src/cli-commands/compile.ts) does not call `loadSession`).
So a compiled program records *what* was compiled but not where the sequence
came from — which `solve` endpoints, which `diagnose` template, or whether a
human typed it. That is open question 3 of the original document arriving
earlier than expected: §5 keeps the raw sequence, but the raw sequence is not
the subject a replay needs.

**D. §2's capability gate is advisory in this path, and the document's
strongest sentence overstates it.** "A `Non` step *physically cannot* write a
file" is true of the runtime's tool-allowlist machinery and not true of
`compile`, which emits `capabilities: ["read"]` as a printed field with no
executor bound to it. Open question 1 concedes this; the prose does not.

**E. Two unrelated meanings of "bind" now share one CLI surface.** `lambda bind`
is the kernel completion gate that refuses `--force`; `--bindings` attaches
model-authored prose to instructions. Also unspecified: §3 assigns a
`modelTier` to *executing* each instruction, but the translator call that
authors the bindings has no tier at all — and §10 suggests routing it to the
cheapest local host. The most consequential text in a high-λ program would be
written by the cheapest model in the pipeline.

**F. The document conflates two different outputs.** An *execution program* is
addressed to a harness; a *prompt* is addressed to a model that has never heard
of this repository. `renderExecutionProgramMarkdown` produces the former — it
prints λ values, class names, and operator glyphs. §9 says the prose is "a
rendering of these frames," but no renderer for the second artifact exists, and
its requirements are different: it must carry its own constraints, and it must
not leak vocabulary its reader cannot resolve. The
[`intent` workflow](../../src/init/workflows.ts) already states this rule for
the agent ("do not explain the operator alphabet… do not cite operator names as
justification") — it has simply never been given a renderer or a check.

Gaps A, B, and F are the ones the rest of this document addresses. C, D, and E
are noted for whoever picks the original suggestion back up.

---

## 2. Three parties, three authorities

The design only works if authority is **disjoint** and each party has a **veto
but not a rewrite**. A party that can quietly repair another's output collapses
the protocol back into one author.

| | May author | May veto | May never |
|---|---|---|---|
| **`lambda` CLI** | legality, `legalNext`, meanings, class, λ, capability, budget, coverage flags, compile/reject | any sequence, any malformed binding | know the domain, know intent, ask a question |
| **Human** (Q&A) | intent, span meanings and types, endpoints, re-scoping, exit-test acceptance, final go/no-go | any binding, any question, the whole program | choose operators, author kernel fields |
| **Host agent** (LLM) | *drafts* of bindings, *drafts* of questions, rendering | nothing — it raises concerns, it does not block | author operators/meanings/λ/capabilities, mark its own draft accepted, decide anything §6 reserves |

The asymmetry in the veto column is deliberate. The agent is the only party
that is neither deterministic nor accountable, so it is the only one without a
veto — and, equally, the only one that may not ratify its own work.

Note that two members of `evidenceRefSchema.kind` — `human-acceptance` and
`domain-check` — exist today with no producer anywhere in this path. A
protocol with a human in it is what would finally give them one, and would
make a human-ratified binding *type-distinguishable* from an agent draft
rather than distinguishable only by trust.

---

## 3. The phase protocol

Each phase ends in one artifact with exactly one author. Phases are resumable
because the artifact is a file — which matters, since a human interview is slow
and humans leave mid-session.

### Phase 0 — Intake and the span table
*Agent drafts · human ratifies · CLI stores*

The agent segments the raw request into numbered spans and **does not interpret
them yet**. The human then confirms the segmentation and types each span:
goal · constraint · assumption · background. The output is the corpus that
`evidenceRefs` has been pretending to cite (gap B), with ids that can be
checked for existence and hashes with a subject.

Typing is not decoration. "Under five minutes" as a *goal* and as a
*constraint* produce different programs, and the difference is not recoverable
from the sentence.

*Open:* whether span segmentation belongs in the kernel at all. It has the same
smell as §7's (D, C) estimator — but a span table the human ratified is
authored data, not a measurement, which is a defensible distinction. It is not
this document's to settle.

### Phase 1 — Endpoints
*Agent proposes · human decides · CLI computes*

The existing `intent` workflow already forbids the agent from authoring a D/C
pair and already makes `none` a legitimate classification. Phase 1 is that rule
with the human actually present: on `none`, the agent asks rather than
abstaining into silence. The human chooses the template, or supplies a target,
or accepts the current reading from `lambda status`.

### Phase 2 — Compile
*CLI only. No model in the loop.*

`lambda compile "<seq>" --json` yields the program plus one `BindingRequest`
per instruction. This is the deterministic spine, and it is the one phase where
adding a party would only add error.

**Degenerate coverage becomes a question, not a note.** Today
`normalizeSequence` flags 3-distinct-operators-across-12-steps and the program
compiles anyway. Under this protocol that flag routes to the human — *your
endpoints produced a repetitive trajectory; re-scope, or proceed knowingly?* —
because it is a scoping problem, and scope is the human's column.

### Phase 3 — The binding interview
*The actual three-way loop, one instruction at a time.*

For each `BindingRequest`, in order:

1. **Agent drafts a question, not a binding.** From `meaning`,
   `cognitiveMove`, and `requiredArtifact`, it asks what this operator operates
   on *in the human's problem*, offering ratified spans as candidate answers.
2. **Human answers** — picks spans, writes an answer, or says *not applicable,
   re-scope*, which is always an available answer.
3. **Agent writes** `domainBinding` / `evidenceRefs` / `exitTest` **from that
   answer**, citing span ids that now exist.
4. **Human ratifies the exit test specifically.** The other two fields may be
   confirmed in batch; this one is the acceptance criterion, and it is the
   human's by definition.
5. **CLI re-validates.** A rejection is not repairable by rewriting the prose
   (§8's rule, applied one level up) — it returns to step 1.

The load-bearing detail, mirroring §4's point about `legalNext`: **candidate
spans should reach the model as an enum**, so a citation of a nonexistent span
is unrepresentable rather than merely wrong. That is the direct fix for gap B,
and it is the same trick the original document already argues for.

### Phase 4 — Render and lint the prompt
*Agent drafts · CLI checks · human approves*

The prompt is rendered for a reader who has never heard of this repository
(gap F), then linted deterministically — see §5.3. The human approves or
returns it.

### Phase 5 — Handback
*Everyone's contribution, labeled*

Ship the prompt with a provenance record: sequence, endpoints, span-table hash,
and per binding whether it was human-ratified or agent-drafted-and-batch-
confirmed. Model-authored stays `inferred`. Human-ratified is where
`human-acceptance` finally earns its place in the enum.

---

## 4. Rationing the questions

"Ask, do not assume" degenerates into an unusable interview if every field
costs a round trip. The λ-band budget that §3 already computes is the natural
ration — the same number that buys fan-out and verification can buy human
attention:

| Band | λ | Existing `verify` | Suggested confirmation |
|---|---|---|---|
| low | < 0.4 | optional | agent drafts; batch-confirm at phase end |
| mid | 0.4–0.7 | single | one question, one confirmation |
| high | > 0.7 | adversarial | individual sign-off, exit test in the human's words |

So `Non` (0.9), `Vale` (0.88), `Meta` (0.8) and `Ana` (0.75) are interviewed
properly, while `Telo` (0.25) and `Latch` (0.29) do not interrupt anyone. This
is not a convenience: an interview that asks everything trains the human to
click accept, which is worse than one that asks less and means it.

One asymmetry worth keeping regardless of band: **exit tests are always
human-ratified.** They are the only field whose whole purpose is to let someone
else check the work.

---

## 5. Imposing the constraint list

The mechanism matters more than the wording. Prose constraints are the weakest
enforcement available — the original document says exactly this about
`legalNext` in §4, and the same critique applies to a list of rules pasted into
a prompt. Five layers, strongest first:

### 5.1 Constraints as data, not prose
A registry — id, statement, rationale, scope (which phase and which field it
governs), and a **detector** describing how a violation is recognized. Authored
in one place, the way [execution-classes.ts](../../src/vocab/execution-classes.ts)
authors execution policy: one table, rendered into the prompt *and* consumed by
the lint, so the rule the agent reads and the rule the checker enforces cannot
drift.

### 5.2 Make violations unrepresentable where the shape allows
Some constraints can be enforced by the schema rather than checked afterward:

- **suggest-not-decide** — a slot that can only hold candidates:
  `{ value, alternatives[], decided: false }`, plus a `decisionsDeferred[]`
  that must be non-empty when a phase touched naming or layout. A decision has
  nowhere to be written.
- **ask-not-assume** — `assumptions[]` where each entry carries either
  `confirmedBy: <human-acceptance ref>` or `open: true`. An unconfirmed
  assumption stays representable but *visibly* unconfirmed, instead of being
  silently baked into a paragraph.
- **cite-or-abstain** — the span enum from §3, already argued above.

This is `instructionBindingSchema`'s `.min(1)` trick generalized: the schema is
where a rule stops being advice.

### 5.3 A deterministic lint over the rendered prompt
Precedent exists — `checkForbiddenSequence` and `lambda doctor`/`sync --check`
both fail closed and exit non-zero. Checkable without a model: every
kernel-authored value appears verbatim; no operator outside the sequence
appears; every instruction's exit test is present; no reserved verb
(`record`/`validate`/`score`/`revise`) is instructed; no imperative naming
("create `<dir>/`", "the command is `<x>`") outside a candidate list; a
questions section exists and is non-empty.

### 5.4 Human ratification of the residue, fail-closed
Whatever the lint cannot decide becomes an explicit question list. `bind` is
the model here: no `--force`, no bypass, and a rejection recorded rather than
argued away.

### 5.5 Constraint provenance in the output
The rendered prompt names the constraint ids it was written under. A later
reader can tell which rules were in force, and a violation found downstream is
attributable to a rule rather than to a mood.

### 5.6 A note on where the constraints already live
Two of them are half-implemented and worth reusing before being rewritten. The
B-Disruptive row of `EXECUTION_MODES` requires "at least two alternatives, or
one counterexample" — that *is* suggest-not-decide, expressed as a required
artifact. And `EPISTEMIC_FOOTER` in `workflows.ts` already states the
reserved-verb and provenance rules to every host. Neither is currently checked.

---

## 6. The constraint list

The first three are the ones supplied; the rest are suggestions to accept,
reject, or reword. Ids are provisional.

| id | Statement | Strongest available layer |
|---|---|---|
| `ask-not-assume` | Any gap in intent becomes a question, not a default. Unconfirmed assumptions are recorded as open. | 5.2 schema + 5.4 |
| `suggest-not-decide` | Never fix a design-specific particular — command spelling, directory name, file layout, id scheme. Offer candidates with trade-offs. | 5.2 schema + 5.3 lint |
| `clear-goal-deferred-decisions` | The instruction must be unambiguous about goal and operation, and explicitly route specific choices to research or to a question. | 5.3 lint |
| `cite-or-abstain` | Every claim about the human's problem cites a ratified span id, or is not made. | 5.2 enum |
| `one-author-per-field` | Each field declares who may write it; a field written by the wrong party is a defect, not a shortcut. | 5.1 registry |
| `name-the-authority` | Every instruction states who judges its exit test — human, kernel, or test suite. Never the executing agent alone. | 5.3 lint |
| `no-unresolved-vocabulary` | The prompt does not use operator names, λ, attractors, or D/C as though the reader knows them. Define inline or say it plainly. | 5.3 lint |
| `reserved-verb-silence` | Never instruct `record`/`validate`/`score`/`revise`, and never narrate what they would do. | 5.3 lint |
| `provenance-honesty` | Nothing model-authored is phrased as measured or verified. `inferred` stays labeled. | 5.1 + 5.3 |
| `bounded-questions` | Asking is rationed by λ band (§4). An interview that asks everything is as broken as one that asks nothing. | 5.1 registry |
| `answerable-without-the-alphabet` | A question the human cannot answer without knowing the operator vocabulary is malformed. Rewrite it. | 5.4 |
| `reversibility` | Any step that writes states how to undo it. | 5.3 lint |
| `scope-fence` | The prompt states what it does not cover; the executing agent stops rather than widens. | 5.3 lint |
| `rejection-is-not-repair` | A failed check is not fixed by rewriting the output. The legal moves are re-ask or re-scope. | 5.4 |
| `abstention-is-success` | "I could not bind this; here are the open questions" is a valid terminal output. | 5.1 registry |

`abstention-is-success` is the one most likely to be dropped and the one that
does the most work. Without it, every other constraint is pressure toward
producing *something*, and the something will be plausible prose — which is the
exact failure the original document was written to prevent.

---

## 7. What this costs

Worth stating plainly rather than discovering later:

- **It is slower than doing the work.** For a small request, the interview
  costs more than the answer. There should be a documented threshold below
  which this protocol is the wrong tool.
- **Question drafting is itself interpretation.** The agent shapes the answer
  by shaping the question. Offering ratified spans as options and always
  including *none of these / re-scope* limits it; nothing removes it.
- **Ratification theatre is the main failure mode.** §4's rationing is the
  mitigation; it is not a proof.
- **Two of the six gaps stay open.** This protocol does not fix sequence
  provenance (C) or make the capability gate real (D).

---

## 8. Where this might land

Marked *candidate*, not *decided* — per `suggest-not-decide`, choosing among
these is a separate act.

| Concern | Candidate homes | Notes |
|---|---|---|
| span table + ratification | new module beside `src/ir/`, or an extension of `schemas.ts` | needs id existence checks and a real hash subject (gap B) |
| the interview | reuse [WizardIO](../../src/init/WizardIO.ts) in the CLI · or the host agent's own ask facility · or both | WizardIO already has the tested property that a flag *is* an IO, not a second code path — so an interview could replay from a recorded answers file in CI |
| constraint registry | a `src/vocab/`-shaped authored-policy module | mirrors `execution-classes.ts`: authored policy, not ported formalism |
| prompt renderer | beside `renderExecutionProgramMarkdown` | different audience, different rules (gap F) |
| prompt lint | a `--check` verb, fail-closed | precedent: `doctor`, `sync --check` |
| CLI surface | flags on `compile` · a new verb · several verbs | **do not** reuse `bind` (gap E); `record`/`validate`/`score`/`revise` are reserved |

---

## Open questions

1. Who owns the Q&A — the CLI (testable, scriptable, replayable in CI) or the
   host agent (has the conversation, has the context)? Both is possible and
   costs a synchronization problem.
2. Does the interview persist across sessions, and where? `.recursive-praxis/`
   is single-session working state today.
3. Is the span table inside this project's scope, or is it the same
   overstep §7 worries about? Argument for: a human-ratified table is authored,
   not measured. That argument is not this document's to accept.
4. Is the constraint registry authored policy (one table, versioned with the
   engine) or per-project configuration? Per-project is more useful and is a
   much larger surface.
5. What happens with no TTY — refuse and name the flag, as `NeedsFlagError`
   does, or accept a pre-recorded answers file? These have different integrity
   properties.
6. Should the translator/binding model tier be tied to the instruction's λ
   band, inverting §10's "route it to the cheapest host"? (Gap E.)
