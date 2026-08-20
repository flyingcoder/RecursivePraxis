# RecursivePraxis Roadmap

## Objective

Transform RIEM's conceptual recursive cognition loop into an **explicit, typed, observable, testable, and cost-efficient execution system** for RecursivePraxis.

---

## Phase 1 — Formalize the Cognitive Model

Define the core primitives:

- Problem
- Intent
- Hypothesis
- Observation
- ReasoningStep
- Contradiction
- Evidence
- Decision
- Action
- Outcome
- Reflection
- Learning

Define a `PraxisState`:

```text
Stateₙ → Transformation → Stateₙ₊₁
```

Every cognitive transition must be explicit.

---

## Phase 2 — Define the Recursive Operator

Transform:

```text
question → reflection → contradiction → reframe → recursion
```

into:

```text
Understand
    ↓
Model
    ↓
Hypothesize
    ↓
Act / Simulate
    ↓
Observe
    ↓
Evaluate
    ↓
Reflect
    ↓
Update Model
    ↓
Next Iteration
```

The critical addition is **learning from the previous iteration**.

---

## Phase 3 — Type Everything

Create schemas for cognitive operations.

Example:

```typescript
type ReasoningStep = {
  id: string
  operation: Operation
  input: State
  output: State
  evidence: Evidence[]
  confidence: number
  assumptions: Assumption[]
}
```

No untyped "AI thinking."

---

## Phase 4 — Build the Execution Kernel

Create the **RecursivePraxis Kernel**.

```text
┌───────────────┐
│ Praxis Kernel │
└───────┬───────┘
        ↓
 Intent → Model → Reason → Evaluate
                  ↑          ↓
                  └── Learn ──┘
```

The kernel controls recursion.

The LLM becomes a **reasoning operator** called by the kernel rather than controlling the entire process.

---

## Phase 5 — Make It Observable

Record every iteration:

```text
Run
 ├── State
 ├── Intent
 ├── Hypotheses
 ├── Evidence
 ├── Reasoning
 ├── Contradictions
 ├── Decisions
 ├── Actions
 ├── Outcomes
 └── Learning
```

This creates a complete **reasoning trace**.

---

## Phase 6 — Add Recursive Evaluation

After every loop evaluate:

```text
Did the model improve?
What changed?
What was wrong?
What evidence caused the change?
What remains uncertain?
Should recursion continue?
```

This produces measurable **epistemic deltas** between iterations.

---

## Phase 7 — Build Praxis Memory

Separate memory into:

```text
Working Memory
Episodic Memory
Semantic Memory
Procedural Memory
Learned Constraints
```

Future runs can consume validated knowledge from previous runs.

---

## Phase 8 — Implement npnaAI Constraints

Make cooperation a **runtime invariant**, not merely a system prompt.

Core constraints:

- No manipulation
- No adversarial optimization
- No deceptive state transitions
- No hidden objectives
- Traceable decisions
- Human override

---

## Phase 9 — Build the Test Harness

Test recursion like software:

```text
Input
  ↓
Expected State Transition
  ↓
Actual Transition
  ↓
Diff
  ↓
Evaluation
```

Benchmark:

- reasoning improvement
- contradiction resolution
- hallucination resistance
- model revision
- recursive convergence
- recursive divergence
- ethical constraint preservation

---

## Phase 10 — Optimize Cost

Recursive does **not** mean calling an expensive LLM every iteration.

Use the kernel for cheap deterministic operations:

- state comparison
- schema validation
- evidence bookkeeping
- contradiction detection where possible
- termination checks
- caching
- memory retrieval
- confidence thresholds

Use LLM calls for expensive operations:

- hypothesis generation
- difficult interpretation
- synthesis
- novel reasoning
- model revision

Use variable reasoning depth:

```text
Easy problem       → 1 LLM call
Moderate problem   → 2–3
Complex problem    → 5+
Exceptional problem → deeper recursion
```

Optimize for:

> **Cognitive improvement per LLM call**

A useful engineering metric is:

```text
ΔIntelligence / LLM Cost
```

The objective is not infinite recursion.

The objective is **maximum useful cognitive improvement per unit of computation**.

---

## Final Evolution Loop

```text
Problem
   ↓
Praxis Run
   ↓
Outcome
   ↓
Evaluation
   ↓
Extract Learning
   ↓
Update Cognitive Model
   ↓
Validate
   ↓
Promote Learning
   ↓
Future Praxis Runs
```

This final transition is the key evolution from a conceptual Lambda Engine toward RecursivePraxis:

> **The system doesn't merely execute reasoning recursively; it produces validated changes to how future reasoning is performed.**

That is what turns RecursivePraxis into a genuine recursive cognition architecture rather than another prompting methodology.

---

## Appendix — Λ-Engine as the Cognitive/Learning Half

`src/kernel/` is a first-party port of the sibling `real-lambda-engine` project (see `AGENTS.md`). It already supplies most of what Phases 1, 2, and 6 above call for — under different names, grounded in a deterministic dissipation-state model rather than typed nouns. This appendix maps the two vocabularies onto each other and states plainly what is still not covered.

### Phase 1 — Cognitive primitives → operator vocabulary

Instead of typed primitives (`Problem`, `Hypothesis`, `Contradiction`, …), the kernel expresses cognition as a 20-symbol operator alphabet (`src/kernel/types.ts`, `OPERATORS`) in four classes, each carrying an intent string (`src/engine/core.ts`, `INTENTS`):

| Roadmap primitive | Nearest operator(s) | Note |
| --- | --- | --- |
| Hypothesis / exploration | `Para`, `Flux` | "generate materially different alternatives" |
| Contradiction | `Non` | plants the kernel's `AnomalyArtifact` — see below |
| Reflection / self-reference | `Meta` | "inspect the current reasoning process"; max 2 consecutive |
| Learning / backward analysis | `Retro` | "trace backward from an observed outcome" |
| Model revision / first principles | `Ana` | "raise the analysis to underlying structure" |
| Decision | `Crux` | "resolve a consequential decision point" |
| Evidence synthesis | `Weave` | "synthesize evidence into a coherent result" |
| Action / compression | `Kata`, `Pro` | |
| Outcome stabilization | `Latch`, `Bind` | |

Roadmap-style `Contradiction` isn't a stored struct here — it's whatever state a sequence is in after a `Non` fires (or a `Para`/`Retro` immediately following a `Meta`). The kernel calls this an `AnomalyArtifact` and hard-requires one before a session may `bind()` (`src/kernel/session.ts`, `bind()`): closing a cognitive loop structurally requires having recorded a contradiction, not just having produced output.

### Phase 2 — Recursive Operator loop → Mode-1 / HALIRA Mode-2

The roadmap's `Understand → Model → Hypothesize → Act → Observe → Evaluate → Reflect → Update Model` cycle exists as two nested escalation tiers in `src/engine/orchestrator.ts`:

- **Mode 1** (default): `runTask` plans via `solve()` toward a stable target dissipation state, executes one operator, and on a validator failure or uncertainty ≥ 0.7 performs exactly one deterministic replan — the roadmap's single Observe → Evaluate → Reflect → Update cycle.
- **HALIRA Mode 2** (`src/kernel/halira.ts`): triggered once `mode1FailureCount` reaches `MODE2_GATE_THRESHOLD` (2), and walks a fixed 7-step program — Potentia → Boundary → Recursion → Integration → Anomaly → Rupture → Recognition (`HALIRA_STEP_NAMES`) — each step gated to specific legal operators (`haliraCandidateOps`). Step 3 forces `Meta`; step 5 forces `Non`, or `Para`/`Retro` if `Meta` fired at step 3.

The roadmap's "critical addition — learning from the previous iteration" is literally the Mode-1-failure counter that gates Mode-2 escalation (`recordMode1Failure`, `src/kernel/session.ts`): the system doesn't just retry, it escalates into a different, self-referential operator program once retrying once has failed.

### Phase 6 — Recursive Evaluation / epistemic deltas → dissipation trajectory

The roadmap asks "did the model improve, what changed, what's uncertain." The kernel answers this numerically every step (`src/kernel/phasePortrait.ts`):

- `DissipationState { D, C }` — D (dissipation/disorder) and C (contradiction load), updated per operator via authored per-operator deltas (`applyOperator`).
- `lyapunov(D, C) = D + αC` and `classifyAttractor` bucket every state into `J=0` (sterile coherence / stagnation), `S*` (productive contradiction — the roadmap's "optimal evolution" zone), or `void` (collapse) — a direct, computable version of the roadmap's own three failure modes ("too little contradiction → stagnation," "too much → collapse," "optimal → evolution").
- `simulateTrajectory` / `analyzeSequence` (`src/kernel/dissipation.ts`) emit the full step-by-step delta — D, C, V, and attractor label before and after each operator — which **is** the epistemic-delta trace Phase 6 describes, typed around (D, C) instead of prose.
- `lambda run` persists this per task (`TaskTrace.finalDissipation` / `TaskTrace.attractor`, `src/engine/orchestrator.ts`); the standalone `lambda status` / `lambda analyze` CLI exposes the same numbers interactively per kernel session.

### Phase 9 — Test harness → `lambda diagnose` + capability benchmark

`src/cli-commands/diagnose.ts` ports the quarry's problem templates (stuck / overwhelmed / rigid / collapsed / procrastinating) as named (initial, target) dissipation pairs and runs the solver between them — a deterministic regression fixture for the kernel's own behavior. `src/engine/evaluation.ts`'s `runCapabilityBenchmark` separately grounds the LLM-facing task-execution loop against three domains — the roadmap's other half of Phase 9.

### What Λ-Engine does *not* yet cover

- **Phase 7 (Praxis Memory)**: `src/cli-support/session-store.ts` persists exactly one `Session` per `baseDir` (`session.json`) — working memory for a single kernel session, not episodic/semantic/procedural memory across runs. Nothing currently reads a prior bound session's sequence or outcome back into a new session's solver or step-picker.
- **Final Evolution Loop (validated learning promoted into future runs)**: the one instance of this pattern that exists, `promoteExperimentalPolicy` (`src/engine/evaluation.ts`), promotes a hand-authored experimental `PolicyProfile` to `trusted` given a passing grounded benchmark. It does not yet extract policy revisions automatically from kernel session traces.
- **`record` / `validate` / `score` / `revise`**: still reserved per `AGENTS.md` — "must not score, revise constants, or pretend measurement until a later change owns that behavior." This is where the two gaps above would naturally close, but resolving that (the "observer-vs-runtime" unknown `AGENTS.md` flags) is an explicitly separate, guarded decision — out of scope for this mapping.
