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

*See: [`docs/inspirations/original-lambda-engine.md`](docs/inspirations/original-lambda-engine.md) — the original Λ-Engine Cursor-rules README this evolved from; [`src/engine/`](src/engine/) — the current deterministic planning/execution/evaluation code.*

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
