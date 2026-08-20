# RecursivePraxis

RecursivePraxis is an experimental cognitive runtime for governing how an AI agent reasons and acts. Instead of accepting an opaque chain of model responses, it represents execution as legal sequences of named cognitive operators over an explicit abstract state.

It is designed to make agent control flow coherent, bounded, auditable, and recoverable:

- deterministic operator legality and sequencing;
- dissipation (`D`) and contradiction (`C`) state tracking;
- budget, capability, typed-output, and evidence-reference gates;
- bounded recovery through the HALIRA Mode-2 program;
- redacted local traces with deterministic semantic replay.

This is a runtime for controlling observable agent execution. It does **not** claim to expose hidden model chain-of-thought or empirically prove that the abstract state is a measure of truth.

## Status

The core kernel, orchestrator, CLI, trace replay, and integration initializer are implemented and tested. The reserved `record`, `validate`, `score`, and `revise` verbs intentionally fail closed and are not capabilities yet.

Read [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) for an architecture overview and [docs/REQUIREMENTS_MATRIX.md](docs/REQUIREMENTS_MATRIX.md) for verified coverage and remaining boundaries.

## Quick start

Requires Node.js 20 or newer.

```sh
npm install
npm test
npm run build
node dist/cli.js --help
```

Try the deterministic fake host without credentials:

```sh
node dist/cli.js plan "Repair a parser regression"
node dist/cli.js run --host fake "Repair a parser regression"
```

`run` prints a task ID and a path under `.recursive-praxis/traces/`. Replay it with:

```sh
node dist/cli.js replay <task-id>
```

For installed package use, the binary name is `lambda`.

## Core model

The kernel has 20 named operators, including `Seed`, `Meta`, `Non`, `Weave`, `Ortho`, and `Kata`. A session records the operator sequence, its state `{ D, C }`, its mode, anomaly artifacts, and whether it is bound.

`bind` is the formal completion gate. It fails unless the sequence is non-empty, does not end on `Ana`, contains a recorded anomaly artifact, and—when recovery is active—has reached HALIRA Recognition.

Normal planning uses a deterministic beam solver toward the stable target `{ D: 0.1, C: 0.1 }`. A first failed validation deterministically replans. A second failure enters Mode 2 and executes `Seed → Axis → Meta → Weave → Retro → Ortho`, then binds at Recognition.

## Safety and auditability

At runtime, RecursivePraxis validates model/router output, checks resource budgets, restricts tool requests by both capability and per-operator allowlists, and records only hashes/metadata rather than raw task content in its traces.

`lambda replay` first checks trace integrity, then replays the recorded operator transitions and verifies the final dissipation state, attractor, recovery mode, and binding result. It verifies the abstract execution—not remote model calls, tool side effects, or the truth of unavailable evidence.

## Documentation

- [Current architecture and audit](docs/CURRENT_STATE.md)
- [Requirements matrix](docs/REQUIREMENTS_MATRIX.md)
- [CLI reference](docs/CLI_REFERENCE.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Exploratory roadmap](specs/explorations/RecursivePraxis_Roadmap.md)

## Development

```sh
npm run build
npm test
npm run test:watch
```

The test suite uses Vitest and includes kernel, CLI, initialization, and runtime-safeguard coverage. See [CONTRIBUTING.md](CONTRIBUTING.md) for development conventions.
