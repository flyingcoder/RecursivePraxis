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

To run the CLI as `lambda` from a checkout — the contributor install path, kept
out of the README quick start deliberately:

```sh
npm link          # then: lambda --help
npm unlink -g recursive-praxis
```

To build the release artifacts locally (five per-target tarballs under
`release/`, gitignored):

```sh
node scripts/build-release-artifact.mjs
```

Each target is staged separately with npm's `--os`/`--cpu`, because the
Anthropic and Cursor SDKs pull per-platform optional packages — staging once
and copying would put macOS binaries inside the Linux tarball.

## Repository map

- `src/kernel/`: formal operator model, constraints, state transitions, solver, and HALIRA state machine.
- `src/engine/`: planning, execution orchestration, traces/replay, and evaluation/promotion.
- `src/adapters/`: structured model transports and deterministic fake host.
- `src/cli-commands/` and `src/cli-support/`: CLI interfaces and persisted session support.
- `src/hosts/`: one class per host agent (Claude Code, Cursor, Codex CLI, opencode) carrying its detection probes, per-scope layout, render pipeline, and invocation syntax; plus the layouts and the registry. Adding a fifth host is one new file and one line in `HostRegistry.default()` — nothing else enumerates hosts.
- `src/detect/`: detection signals, the single confidence ladder that ranks them, and `HostContext` (the injected view of env, home, filesystem, and PATH that makes detection testable against a synthetic machine).
- `src/render/`: the `unified`/remark pipeline that turns a host-neutral workflow into one host's file, and the managed-marker merge that makes writes non-clobbering.
- `src/manifest/`: `install.json` — what was written, by which version, at which scope — and the inspection `doctor`, `sync`, and `uninstall` share.
- `src/init/`: the four-step `init` wizard, its steps, the `WizardIO` implementations (TTY, flags, scripted), and the file writer.
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
7. Generated host files must stay a fixed point of the render pipeline: `render(w) === restringify(render(w))` for every workflow, host, and scope. Without it an idempotent `init` silently becomes a churning one, and `doctor` reports permanent, meaningless drift. `tests/render.test.ts` asserts this.
8. Workflow prose lives in `src/init/workflows.ts` only. Reference another workflow with `{{invoke:<id>}}` rather than naming a host's invocation syntax literally — the placeholder is rewritten per host and scope, and a literal would be correct on at most one host.
9. Detection contributes evidence; it never authorizes a write. Env markers are heuristic and must be labelled as such, and a host adapter must not count this tool's own generated files as evidence of the host.

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
