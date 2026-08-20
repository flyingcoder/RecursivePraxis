# RecursivePraxis: current architecture and audit

This document describes the repository as it exists today. It separates implemented, verified behavior from intended-but-unimplemented work so that the runtime is not represented as more mature than it is.

## Purpose

RecursivePraxis is an experimental cognitive runtime. It turns agent reasoning into named operator transitions over an abstract state instead of treating a model response as an opaque chain of thought. The runtime's job is to determine which transitions are legal, bound execution with budgets and capabilities, preserve a redacted trace, and recover through a prescribed program when normal reasoning fails.

The public CLI command is currently named `lambda` (see `src/cli.ts`).

## Implemented architecture

### 1. Deterministic kernel

`src/kernel/` defines a 20-operator alphabet (`Operator`) and immutable `Session` state:

- The state is `DissipationState { D, C }`, where `D` is dissipation/disorder and `C` is contradiction load.
- Every `step(session, operator)` checks `legalNext` and shared hard constraints before applying an authored state transition. Illegal transitions return a failed `KernelResult`; they never mutate the old session.
- `classifyAttractor` classifies the resulting abstract state as `J=0`, `S*`, or `void`.
- `solve` performs deterministic beam search toward the authored stable target `{ D: 0.1, C: 0.1 }`.
- `bind` is the completion gate. It requires a non-empty sequence, an anomaly artifact, a final operator other than `Ana`, and—when in Mode 2—arrival at Recognition (HALIRA step 7).

The kernel treats `Non`, or `Para`/`Retro` in the appropriate `Meta` context, as an `AnomalyArtifact`. This makes contradiction acknowledgment structurally necessary for completion.

### 2. Planning and operator contracts

`src/engine/core.ts` turns a solver sequence into a deterministic `Plan`.

- The operator pack contains versioned, typed contracts: intent, input/output schemas, preconditions, postconditions, allowed capabilities/tools, validators, stop conditions, and authored priors.
- A normal plan is rejected if it violates the grammar, misses the model capability, or exceeds remaining token, cost, call, tool-call, or latency budgets.
- Normal solver plans receive an anomaly-producing suffix when needed so they are bindable by construction.
- A separate `planHaliraRecoveryTask` produces the Mode-2 recovery program rather than calling the general beam solver.

### 3. Runtime execution, recovery, and completion

`src/engine/orchestrator.ts` owns `runTask`.

1. An optional router provides uncertainty, contradiction signals, unresolved claims, and evidence references.
2. The runtime plans and executes model steps in order, validating the output shape before it becomes trace data.
3. A failed validator or uncertainty of at least `0.7` triggers one Mode-1 replan.
4. A second Mode-1 failure records the failure and enters HALIRA Mode 2.
5. Mode 2 executes the fixed program `Seed → Axis → Meta → Weave → Retro → Ortho`, advances the HALIRA program counter after each corrective operator, then reaches Recognition and calls `bind`.
6. A run is only `completed` when `bind` succeeds. Otherwise it is recorded as `stopped`, `failed`, or `unbound`.

The prescribed `Retro` at the Mode-2 anomaly step is legal because `Meta` was recorded at step 3; it creates the required anomaly artifact under the kernel's Mode-2 rule.

### 4. Safeguards implemented at execution boundaries

The current runtime validates the following before accepting model or routing results:

- model output is structured: summary, artifacts, requested tools, usage, validator result, uncertainty, and evidence references;
- usage fields are finite and non-negative; uncertainty is finite and in `[0, 1]`;
- evidence references have a non-empty ID, a known kind, and a 64-character SHA-256-style hash;
- router usage is budgeted before routing starts;
- model-reported actual usage is checked against remaining budget after the call, so an estimate cannot hide an overrun;
- requested tool calls require an available tool host, a granted capability, an operator allowlist entry, safe bounded names/arguments, and a timeout of at most 30 seconds;
- tool duration must be finite, non-negative, and no greater than its requested timeout.

The trace stores artifact hashes, not artifact contents. It stores an objective hash and abstract dissipation states, not the raw objective. Trace files are atomically written with mode `0600` by `FileTraceRepository`.

### 5. Trace and replay

`TaskTrace` schema `1.1.0` contains the initial and final abstract state, plan, event sequence, usage, terminal status, attractor, HALIRA mode, binding result, and a SHA-256 trace hash. It explicitly sets `rawContentIncluded: false`.

`verifyReplay` performs two checks:

1. It recomputes the trace hash to detect ordinary content modification.
2. It replays the recorded operators through the kernel, including Mode-1 failure handling, HALIRA escalation/progression, and binding. It then compares the reproduced final dissipation, attractor, bound flag, and HALIRA mode to the trace. It returns diagnostic reasons rather than a hash-only boolean.

This is deterministic semantic verification of the recorded abstract execution. It is not a re-execution of model calls or external tools.

## Entry points

- `lambda plan <task>`: deterministic budgeted operator plan.
- `lambda run [--host ...] <task>`: execute through fake, Anthropic, Cursor, or Claude IDE hosts.
- `lambda inspect <task-id>` / `lambda replay <task-id>`: inspect or verify redacted traces.
- `lambda status`, `sense`, `step`, `analyze`, `solve`, `diagnose`, `halira`, `bind`, `ir`: direct kernel/session inspection and control.
- `lambda eval` / `lambda promote`: run the three-domain capability benchmark and promote a policy only with grounded passing evidence.
- `lambda init`: emit host-native integration files for Claude Code, Cursor, and Codex.

## Verification evidence

The current test suite covers grammar rejection, dissipation and solver behavior, session/HALIRA gates, CLI behavior, initialization, budgeting, typed outputs, model evidence validation, tool allowlisting, redacted trace persistence, tamper detection, semantic replay, and a completed Mode-2 recovery path.

At the time this document was written, `npm test` passed with **106 tests in 10 test files**. A manual CLI `run` followed by `replay` also returned `reproducible: true` with no replay reasons.

## Deliberate non-goals and incomplete areas

The repository already fails closed for the following reserved verbs; they are not implemented and must not be described as capabilities:

- `record`
- `validate`
- `score`
- `revise`

The broader roadmap in `specs/explorations/RecursivePraxis_Roadmap.md` remains partially future-facing. In particular:

- There is no cross-run episodic, semantic, or procedural memory. `session-store.ts` is single-session working state.
- There is no automatic extraction of learned policy changes from traces; policy promotion is benchmark-gated but starts from a supplied experimental profile.
- The abstract D/C state is authored formalism, not a measured or calibrated model of real-world truth, quality, or contradiction.
- Replay proves consistency of a redacted, deterministic abstract trace. It cannot prove that a model summary was truthful, that an evidence hash corresponds to content unavailable in the trace, or that an external tool's side effect was reproduced.
- Tool-host results are currently appended after duration validation, but their `evidence` object and optional `artifactHash` are not runtime-validated with the same strict validator used for model/router evidence. This is a known evidence-ingress gap; no implementation change has been made here.
- Plans require the `model` capability at planning time. Non-model capabilities are enforced when a model requests a tool, rather than treated as mandatory requirements for every tool-capable operator.
- Trace hashes are integrity checks, not signatures. Anyone who can rewrite a trace can recompute its hash; semantic replay still detects incoherent terminal state, but provenance requires a future signing or trusted-storage design.

## Design interpretation

The runtime makes control flow inspectable and deterministic around model calls; it does not claim to inspect hidden model reasoning. The intended guarantee is narrower and more useful: every action the runtime accepts is associated with a named operator, legal session transition, typed observable result, bounded resource use, evidence reference, and replayable terminal state.
