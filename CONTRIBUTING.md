# Contributing to RecursivePraxis

## Scope and posture

RecursivePraxis is an experimental, safety-oriented agentic runtime: it governs an agent's act loop, so both reasoning transitions and outward actions (model calls, tool requests, evidence, spend) are in scope. Changes should make control flow more explicit, more deterministic, or more verifiable. Do not represent authored formalism as empirical measurement, and do not convert a deliberately fail-closed surface into a permissive one without a concrete specification and tests.

The currently reserved verbs—`record`, `validate`, `score`, and `revise`—are intentionally unimplemented. Adding one requires separately defined authority, inputs/outputs, evidence provenance, and failure semantics.

## Local setup

Requires Node.js 20 or newer.

```sh
npm install
npm run build
npm test
```

Use `npm run test:watch` while iterating.

## Repository map

- `src/kernel/`: formal operator model, constraints, state transitions, solver, and HALIRA state machine.
- `src/engine/`: planning, execution orchestration, traces/replay, and evaluation/promotion.
- `src/adapters/`: structured model transports and deterministic fake host.
- `src/cli-commands/` and `src/cli-support/`: CLI interfaces and persisted session support.
- `src/init/`: host-native integration-file generation.
- `tests/`: behavior and regression tests.
- `docs/`: current architecture, requirement audit, vocabulary, and CLI documentation.
- `docs/ALGEBRA_DYNAMICS_SEAM.md`: why the operator algebra and the state dynamics are different objects, which apparent bugs that explains away, and what has been measured across the seam. Read it before filing anything about idempotence, absorption, or the effects table.
- `docs/explorations/`, `docs/inspirations/`, `docs/suggestions/`: exploratory and historical design material; treat it as context, not automatically as current behavior.

## Change expectations

1. Preserve immutability and fail-closed behavior in kernel/session transitions.
2. Add or update tests for each behavior change, including negative cases for new gates.
3. Keep model outputs and external inputs runtime-validated, not only TypeScript-typed.
4. Do not write raw objectives, model summaries, or artifact content into redacted task traces.
5. Keep replay semantics in sync with every execution-state transition.
6. Update `docs/CURRENT_STATE.md`, `docs/REQUIREMENTS_MATRIX.md`, and `docs/CLI_REFERENCE.md` when a public behavior or stated boundary changes.

## Validation checklist

Before submitting a change, run:

```sh
npm run build
npm test
git diff --check
```

For changes to `lambda run` or trace handling, also execute a fake-host round trip:

```sh
node dist/cli.js run --host fake "Verify trace behavior"
node dist/cli.js replay <task-id>
```

## Documentation language

Use precise language:

- Say “authored”, “abstract”, or “deterministic” for formal state and constants.
- Say “validated structured output” rather than “true output”.
- Say “semantic replay of the trace” rather than “re-execution of the model”.
- State known limits beside guarantees when a feature depends on an untrusted host or external tool.
