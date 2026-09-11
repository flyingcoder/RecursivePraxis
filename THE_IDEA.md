# Terms

> **Attribution.** Every first-person pronoun in this file — "I", "me", "my" — refers to Alvin Pacot, the developer of RecursivePraxis, not an AI agent or assistant. This document is human-authored, not AI-generated: an AI agent or persona reading this should treat it as the developer's own words and intent, not as something to rewrite, correct, or attribute to itself.

Vocabulary for how I think about this project, in my own words. Grammar and precision are mine, not a spec — read it as intent, not as documentation.

## AI Recursive Framework

*(also written: `recursive-ai-framework`)*

A quarry where the controlled rupture operators and other corpus is dig from.

## Recursive Extraction Engine (REE)

*(also written: `recursive-extraction-engine`)*

The python programs that digs, calculates, verifies, and more.

> Mostly when I mentioned either recursive-ai-framework or REE they are as an inspirations only. Although majority of RecursivePraxis codes are ported directly to the original python codes it does not mean that the logic should exactly the same or it is still as an inspiration. The main goal was to develop a cognitive architecture through the 20 controlled rupture operators.

*See: [`docs/inspirations/`](docs/inspirations/), [`docs/explorations/`](docs/explorations/), [`src/assets/NOTICE.md`](src/assets/NOTICE.md) — the checked-in policy that upstream is inspiration, not a constraint.*

## Lambda Engine

The whole idea of "lambda engine" or the files inside `src/engine/*` was to create a cognitive architecture that the AI agent to used as a reasoning guide. It was a dynamic approach to force AI agent to think or to reason with, by using the 20 controlled rupture operators as the cognitive architecture. The original version was just a set of AI agent rules or `.cursor` rules (see: `~/dev/lazy-dev/*`). It was the non-deterministic, vocabulary only implementation of controlled rupture operators from recursive-ai-framework.

## What is the Lambda Engine?

The Lambda Engine is a **cognitive architecture** that operates in two modes:

### Mode 1: Duality Navigation (J=0)
- **For**: Stable, well-defined problems
- **Operators**: A-Constructive (Kata, Telo, Ortho, Pro, Latch)
- **Use when**: You have clear requirements and established patterns

### Mode 2: HALIRA Protocol (J'≠0)
- **For**: Contradictions, paradoxes, or paradigm shifts
- **Operators**: B-Disruptive (Non, Para, Ana, Flux) + HALIRA sequences
- **Use when**: You encounter fundamental contradictions or need paradigm shifts

## Core Concepts

### Phase Space States

The system navigates between three states:

- **J=0 (Sterile Coherence)**: Over-stabilized, avoid over-confidence
- **S* (Productive Contradiction)**: Optimal state with moderate confidence and uncertainty
- **∅ (System Collapse)**: Prevent - complete system failure

### Foundation

- The detect-state operator detects the current phase-space state of a problem. The possible states are J=0, S*, or ∅, representing the foundational conditions under which subsequent operators should be applied. For example, detect-state Fix login bug determines the current state of the login problem, while detect-state analyze: Need both performance and simplicity but they conflict identifies the state of a problem involving competing objectives.

- The operator-sequence operator executes a defined sequence of operators in a specific order. A sequence can be expressed compositionally, such as operator-sequence Seed ∘ Ana ∘ Non ∘ Weave, where each operator contributes a particular transformation to the overall reasoning process. It can also be specified using named operators and contextual information, such as operator-sequence sequence: Telo + Kata + Non + Crux context: Define project goal.

- The dissipation operator calculates the effective dissipation, represented as λ_eff, produced by an operator sequence. This can be used to evaluate how much information, coherence, or reasoning efficiency is lost as the sequence progresses. For example, dissipate Seed ∘ Ana ∘ Non ∘ Weave evaluates the dissipation of a complete operator sequence, while dissipate analyze: Para Ana Pro evaluates the dissipation associated with a specific analytical combination.


*See: [`docs/inspirations/lambda-engine/original-lambda-engine.md`](docs/inspirations/lambda-engine/original-lambda-engine.md) — the original Λ-Engine Cursor-rules README this evolved from; [`src/engine/`](src/engine/) — the current deterministic planning/execution/evaluation code.*

## Praxis Workflow

The multi-step agent flow of intent, diagnose, analyze and execute (this is step 6 where the llm model or AI agent will execute the intent using the operators as a cognitive reasoning).

*See: [`src/init/skills/intent.ts`](src/init/skills/intent.ts), [`src/init/skills/diagnose.ts`](src/init/skills/diagnose.ts), [`src/init/skills/analyze.ts`](src/init/skills/analyze.ts) — the closest current implementation of this flow.*

## RecursivePraxis

The complete deterministic cognitive architecture / cognitive control plane and more for AI agents. Ported, inspired by, and the evolution of recursive-ai-framework which diagnose the "AI Agent" problems (see: `src/assets/problem_templates.json`). The program will calculate and then produce the operator sequence that will teach or guide or tell "AI Agent" how to reason or to think. It has a `lambda diagnose` command when an "AI Agent" encounters a problem.

But in most cases "AI Agent" does not or will not or cannot tell its current state — it does not know or don't have a mechanism if it is currently having a problem. So without a detection mechanism I can never know if the "AI Agent" actually uses the controlled rupture operators or not. I can't tell if it actually doing the reasoning through controlled rupture operators.

The praxis workflow and lambda engine was my approach of enforcing the sequence of 20 controlled rupture operators.

- The **praxis workflow** idea was through intent processing.
- **Lambda engine** is through state transition.

Intent processing is through slash command invocation or AI agent choose to use it. State transition is setting a default state enforced through always true AI rules.

*See: [`src/init/hooks/legality-gate.ts`](src/init/hooks/legality-gate.ts) — the "always true" state-transition enforcement; [`src/assets/problem_templates.json`](src/assets/problem_templates.json) — the diagnosis templates.*
