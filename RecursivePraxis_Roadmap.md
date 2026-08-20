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
