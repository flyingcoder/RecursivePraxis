# Suggestion — translating an operator sequence into a cognitive execution language

Status: suggestion, with §1–§6 and §8 prototyped behind `lambda compile`.
§7 (the closed (D, C) loop) remains unimplemented and is the part most likely
to overstep this repo's provenance boundary. See [NOTICE.md](NOTICE.md).

This picks up step 4 of
[suggested-human-ai-lambda-flow.md](suggested-human-ai-lambda-flow.md):

> LLM agent uses the operator-sequence meanings to write clear prompt-like
> instructions based on human intent.

The gap is that "use the meanings to write instructions" is exactly the step
where an agent hallucinates. `Crux — Core pivot, hinge` is a *label*, not an
instruction. Handed a bare sequence, a model writes plausible prose and the
engine's determinism is thrown away at the last hop.

The suggestion is to stop treating the translation as prose generation and
treat it as **compilation into a typed instruction format** — an execution
language where most fields are computed by the kernel and the model only fills
the domain-binding slots.

---

## 0. The empirical constraint nobody should skip

A raw `lambda solve` result is a **trajectory in (D, C) space, not a program**.
Actual output from this checkout:

```sh
$ lambda solve --initial 0.9,0.1 --target 0.3,0.7 --json
SUCCESS | len=12 | Telo ∘ Telo ∘ Telo ∘ Telo ∘ Telo ∘ Para ∘ Crux ∘ Crux ∘ Crux ∘ Telo ∘ Para ∘ Crux

$ lambda solve --initial 0.5,0.5 --target 0.2,0.85 --json
SUCCESS | len=8  | Para ∘ Telo ∘ Telo ∘ Telo ∘ Para ∘ Para ∘ Telo ∘ Para
```

The beam search in [solver.ts](../../src/kernel/solver.ts) optimizes terminal
distance plus dissipation cost. Repetition is cheap in that objective, so it
converges on a narrow subset (`Telo`, `Para`, `Crux`, `Retro`) and repeats it.
"Telo five times" is a fine trajectory and a useless cognitive instruction.

Two consequences for any translation design:

1. **Normalize before translating** (§5) — run-collapse repeats into one
   instruction with an iteration count.
2. **Prefer the interactive path over `solve`** (§4) — `sense → ir → step`
   keeps the whole 20-operator alphabet live via `legalNext`, and lets the
   agent choose using domain knowledge the solver does not have.

---

## 1. Pattern A — the instruction frame

The unit of the execution language is a struct, not a paragraph. Split fields
by who authors them:

```ts
interface CognitiveInstruction {
  // --- kernel-computed, model MUST NOT alter ---
  readonly index: number;
  readonly op: Operator;              // src/kernel/types.ts
  readonly symbol: string;            // operatorSymbol()
  readonly className: OperatorClass;  // operatorClass()
  readonly lambda: number;            // lambdaIntrinsic()
  readonly meaning: string;           // operatorMeaning()
  readonly capability: Capability;    // derived from className — §2
  readonly budget: ExecutionBudget;   // derived from lambda band — §3

  // --- model-authored, schema-constrained ---
  readonly domainBinding: string;       // what this op operates on, in the user's nouns
  readonly evidenceRefs: EvidenceRef[]; // spans of the human input it binds to — §6
  readonly exitTest: string;            // falsifiable check that this step happened
}
```

`meaning` stays verbatim from `formalism.json`; the model's job is
`domainBinding` + `exitTest` only. That is the whole trick — the model
*applies* vocabulary it is forbidden from *inventing*.

Enforce with Zod next to the existing contracts in
[schemas.ts](../../src/adapters/schemas.ts), which already has
`evidenceRefSchema` and `toolCallSchema` to build on.

---

## 2. Pattern B — operator class becomes a capability schedule

This is the strongest agentic idea available here, because it is *enforceable*
rather than advisory. `toolCallSchema` already types
`capability: "read" | "write" | "shell" | "network"`. Map the four operator
classes onto execution modes and gate the toolset:

| Class | Operators | Cognitive move | Allowed capability | Required artifact |
|---|---|---|---|---|
| **B-Disruptive** | Ana, Para, Non, Fold, Flux | diverge, attack, rupture | `read` only | ≥2 alternatives or a counterexample |
| **C-Reflexive** | Meta, Retro, Echo, Braid, Seed | inspect own prior output | `read` (own trace) | critique referencing earlier steps by index |
| **D-Structural** | Crux, Weave, Bind, Axis, Vale | frame, integrate, freeze | `write` (contracts/schemas) | a named frame, hinge, or committed contract |
| **A-Constructive** | Kata, Telo, Ortho, Pro, Latch | converge, concretize, commit | `read` + `write` | a concrete edit or decision |

A `Non` step *physically cannot* write a file. A `Bind` step cannot go
exploring. The sequence stops being a mood and becomes a **permission
schedule over time** — which is the part an agent harness can actually
enforce, with or without a cooperative model.

---

## 3. Pattern C — λ band becomes an execution budget

`lambdaBandFor()` already exists in [compile.ts](../../src/ir/compile.ts) but
only feeds display. Give it teeth:

| Band | λ | Branch fan-out | Verification | Model tier |
|---|---|---|---|---|
| low | < 0.4 | 1 | optional | cheap / local (ollama) |
| mid | 0.4–0.7 | 2–3 | one verifier pass | standard |
| high | > 0.7 | 4+ | mandatory adversarial verify | strongest |

So `Non` (λ=0.9), `Vale` (0.88), `Meta` (0.8) and `Ana` (0.75) automatically
buy fan-out and a mandatory refutation pass, while `Telo` (0.25) and `Latch`
(0.29) run as a single deterministic pass. Dissipation stops being decorative
and starts controlling spend.

Per-step budget uses `lambdaIntrinsic`; the whole-program budget uses
`lambdaEffective` — for the §9 example, 0.654, i.e. mid band overall.

---

## 4. Pattern D — the kernel is the program counter, the agent is the ALU

The interpreter loop is already 80% built. `compileIR()` emits `legalNext`
plus the hard rule `"do not invent operators outside legalNext"`.

```
lambda sense --d .. --c ..      # establish state
loop:
  lambda ir --json              # → legalNext[], mode, haliraStep, lambdaBand
  agent picks op ∈ legalNext    # ← constrained choice, NOT free generation
  agent fills the frame (§1) and executes under §2/§3 limits
  agent produces the artifact + exit-test result
  lambda step --op <chosen>     # advance the program counter
  lambda sense --from <reading> # §7
until bind
```

The load-bearing detail: **`legalNext` should reach the model as an enum, not
as prose.** Pass it as the allowed values of a structured-output field (or a
tool-arg enum), so an illegal operator is unrepresentable rather than merely
discouraged. Today the constraint is a sentence in a markdown prompt, which is
the weakest possible enforcement.

---

## 5. Pattern E — normalize before you translate

Given §0, insert a normalization pass between `solve` and translation:

- **Run-collapse.** `Telo ∘ Telo ∘ Telo` → one instruction, `iterations: 3`,
  read as *intensity* ("project toward the goal until the goal is stable"),
  not three separate cognitive acts.
- **Report alphabet coverage.** If a 12-step solve uses 3 distinct operators,
  say so in the compiled program. That is a signal the (D, C) endpoints were
  poorly chosen, and it should surface rather than be laundered into eight
  paragraphs of confident prose.
- **Keep the raw sequence attached.** The collapsed program is for execution;
  the raw sequence stays for replay/verification against the trace.

---

## 6. Pattern F — bind operators to the user's own nouns

The anti-hallucination rule for `domainBinding`: **every binding must quote a
span of the human input.** Reuse `evidenceRefSchema` (`kind: "input"`) so each
instruction carries the span it came from. Reject any frame whose binding
cites nothing.

Without this, `Crux — core pivot` reliably becomes "identify the key tension"
for every input ever submitted. With it, `Crux` must name *this* hinge.

---

## 7. Pattern G — close the loop, and stay honest about provenance

Each step's artifact should produce a fresh (D, C) reading fed back via
`lambda sense --from`, so the trajectory is closed-loop. A workable estimator:
D from unresolved-contradiction density in the artifact, C from the count of
newly committed constraints.

**Provenance boundary:** [VOCABULARY.md](../VOCABULARY.md) records that this
engine only ever produces `authored` values, and
[CLI_REFERENCE.md](../CLI_REFERENCE.md) marks `record`, `validate`, `score`,
and `revise` as intentionally unimplemented. An agent-estimated (D, C) is
therefore `inferred` — never `measured`. Label it that way in the frame, or
the execution language quietly manufactures the measurement layer this repo
has deliberately declined to build.

---

## 8. Pattern H — rejection is not something the agent may "fix"

When `checkForbiddenSequence` rejects, the agent must **not** repair the
sequence by rewriting it. Two legal moves only:

1. re-`solve` with different endpoints, or
2. let `mode1FailureCount` reach `MODE2_GATE_THRESHOLD` (2) and drop into
   HALIRA mode 2.

Mode 2 is itself a ready-made cognitive execution language — the seven step
names in [halira.ts](../../src/kernel/halira.ts) (Potentia, Boundary,
Recursion, Integration, Anomaly, Rupture, Recognition) with a fixed candidate
operator per step. The translator for mode 2 is nearly trivial: the step name
*is* the instruction verb, and `haliraCandidateOps()` supplies the operand.

---

## 9. Worked example

Human input from the flow doc: *"…100% automated with zero-touch delivery…
under five minutes. But… a senior engineer and a security specialist must
manually review and sign off on every single change."*

Hand-picked sequence (grammar-accepted, λ_eff = 0.654, mid band):

```sh
$ lambda check Axis Crux Ana Meta Para Weave Kata Bind
accept: Axis → Crux → Ana → Meta → Para → Weave → Kata → Bind
```

Compiled to instructions (abridged — two frames):

```jsonc
{
  "index": 1,
  "op": "Crux", "symbol": "⊗", "className": "D-Structural", "lambda": 0.42,
  "meaning": "Core pivot, hinge",
  "capability": "write",                            // D-Structural: contracts only
  "budget": { "fanOut": 2, "verify": "single" },    // mid band
  "domainBinding": "The hinge is not automation-vs-review; it is that 'zero-touch' and 'sign-off on every single change' both bind the same commit event.",
  "evidenceRefs": [{ "id": "span:2", "kind": "input", "hash": "<sha256>" }],
  "exitTest": "A one-sentence statement of the hinge that both stated goals can be checked against."
},
{
  "index": 4,
  "op": "Para", "symbol": "∥", "className": "B-Disruptive", "lambda": 0.65,
  "meaning": "Deviation, injects instability",
  "capability": "read",                             // B-Disruptive: cannot write
  "budget": { "fanOut": 3, "verify": "single" },
  "domainBinding": "Deviate from the shared premise that review must block the commit event: pre-approved change classes, post-deploy attestation, progressive rollout with a signed gate at 1% traffic.",
  "evidenceRefs": [{ "id": "span:2", "kind": "input", "hash": "<sha256>" }],
  "exitTest": "≥3 delivery topologies where both constraints hold, none of which is 'relax one requirement'."
}
```

The prose an agent finally writes is a *rendering* of these frames — the same
relationship `renderIRMarkdown()` already has to `IRPayload`.

---

## 10. Where this would land

| Concern | Home | Status |
|---|---|---|
| class → capability, λ band → budget tables | [execution-classes.ts](../../src/vocab/execution-classes.ts) | prototyped |
| `compileExecutionProgram(sequence)` | [execution.ts](../../src/ir/execution.ts) | prototyped |
| run-collapse / normalization (§5) | [normalize.ts](../../src/ir/normalize.ts) | prototyped |
| binding Zod schema (§1, §6) | `instructionBindingSchema` in [schemas.ts](../../src/adapters/schemas.ts) | prototyped |
| `lambda compile <seq> [--bindings <file>] [--json]` | [compile.ts](../../src/cli-commands/compile.ts) | prototyped |
| translator model call (cheap/local) | existing [ollama-transport.ts](../../src/adapters/ollama-transport.ts) | not wired |
| (D, C) estimator feeding `lambda sense` (§7) | — | not built; see open question 2 |

The prototype deliberately stops before the model call. `compileExecutionProgram`
emits the kernel-authored program plus one `BindingRequest` per instruction;
`bindExecutionProgram` validates and attaches whatever a translator returns.
Nothing in the path invents an operator, a capability, or a meaning.

Test-gap note (now partly closed): codegraph reported **no covering tests** for
`parseOperatorSequence`, `lookupOperator`, `allOperatorNames`, or `compileIR`.
[tests/ir/execution.test.ts](../../tests/ir/execution.test.ts) covers the
compiler and `parseOperatorSequence`; `lookupOperator`, `allOperatorNames`, and
`compileIR` remain untested.

---

## Open questions

1. Should the capability gate (§2) be advisory metadata or hard-enforced by the
   harness? Hard enforcement is the whole value, but it requires the executor
   to run inside something that can actually deny a write.
2. Is the (D, C) estimator (§7) inside this project's scope at all, given that
   `score`/`validate` are deliberately unimplemented? A defensible answer is
   that the estimator lives in the *agent*, never in the kernel.
3. Does run-collapse (§5) distort replay? The compiled program and the raw
   sequence must both be recorded, or `verifyReplay` loses its subject.
