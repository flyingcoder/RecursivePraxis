<div align="center">

<img src="recursive-praxis-cover.png" alt="RecursivePraxis — agentic cognitive runtime for observable AI execution" width="100%" />

<br />

[![Node](https://img.shields.io/badge/node-%3E%3D20-2dd4bf?style=flat-square&logo=node.js&logoColor=white)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white)](tsconfig.json)
[![Tested with Vitest](https://img.shields.io/badge/tested%20with-vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)](vitest.config.ts)
![Status](https://img.shields.io/badge/status-dev-blue)

</div>

<p align="center">
  <strong>RecursivePraxis</strong> is an agentic cognitive runtime for governing how an AI agent reasons and acts.
  Instead of accepting an opaque chain of model responses, it represents execution as legal sequences of
  named cognitive operators over an explicit abstract state.
</p>

<p align="center">
  <sub>REASON &nbsp;•&nbsp; ACT &nbsp;•&nbsp; LEARN &nbsp;•&nbsp; IMPROVE</sub>
</p>

<br />

It is designed to make agent control flow **coherent**, **bounded**, **auditable**, and **recoverable**:

| | |
|---|---|
| ⚖️ **Deterministic legality** | Operator legality and sequencing are checked deterministically at every step. |
| 📉 **D / C state tracking** | Dissipation (`D`) and contradiction (`C`) are tracked continuously across a session. |
| 🧭 **Context injection** | Every turn is briefed with the session's mode, attractor, and legal next operators — not left to the agent to remember. |
| 🔁 **Bounded recovery** | The HALIRA Mode-2 program recovers a stalled session with discipline, not retries-until-luck. |

> This is a runtime for controlling **observable** agent reasoning — the operator sequence an agent moves
> through, and the abstract state that sequence produces. It does **not** claim to expose hidden model
> chain-of-thought, or empirically prove that the abstract state is a measure of truth.

**Agentic means governed, not autonomous.** RecursivePraxis is a control plane *for* an agent, not an
agent framework: it ships no planner library, no tool catalog, and no cross-run memory, and it never
starts work on its own. A host agent — Claude Code, Cursor, or Codex via `lambda init` — or you at the
CLI drives every step, and the runtime decides which steps are legal and whether the session may be
bound, briefing the agent's context with that state on every turn.

<br />

## Status

The core kernel, CLI, context-injection hook, and integration initializer are implemented and tested.
The reserved `record`, `validate`, `score`, and `revise` verbs intentionally **fail closed** and are not
capabilities yet.

See the reserved-verb boundaries in [docs/CLI_REFERENCE.md](docs/CLI_REFERENCE.md).

<br />

## Install

Installation happens in two steps, and the first one is deliberately inert.
Installing the CLI puts the `lambda` executable on your machine and touches no
host agent — no `.claude/`, no `.cursor/`, no `.agents/`, no `.opencode/`.
Nothing reaches a host agent until you run `lambda init` and answer four
questions.

Requires **Node.js 20+**.

**Step 1 — install the CLI**

```sh
npm install -g recursive-praxis     # then: lambda init
npx recursive-praxis init           # or, without a global install
```

macOS and Linux, without npm. Read the script first — the pipe form is the
shorter alternative, not the recommended one:

```sh
curl -fsSLO https://raw.githubusercontent.com/flyingcoder/RecursivePraxis/main/install.sh
less install.sh && sh install.sh
```

Windows (PowerShell 5.1+, never elevated):

```powershell
Invoke-WebRequest https://raw.githubusercontent.com/flyingcoder/RecursivePraxis/main/install.ps1 -OutFile install.ps1
Get-Content install.ps1 | more
.\install.ps1
```

Both scripts verify the download against the published `SHA256SUMS` and fail
closed on a mismatch. Pin a version in CI with `LAMBDA_VERSION=v0.2.0`, and
override locations with `LAMBDA_INSTALL_DIR` (default `~/.recursive-praxis-cli`)
and `LAMBDA_BIN_DIR` (default `~/.local/bin`). Neither script uses `sudo`.

**Step 2 — configure host agents**

```sh
lambda init
```

Four questions: which host agents were detected, which to configure, project or
global scope, then generate. Flags pre-answer any step and skip it, so the same
run is fully scriptable:

```sh
lambda init --tools claude,cursor --scope global
lambda init --tools all --scope project --json      # CI
```

Without a terminal to prompt, a missing `--tools` exits non-zero naming the
flag rather than guessing.

**Uninstalling** — there were two installs, so there are two removals:

```sh
lambda uninstall                      # the generated host-agent files
sh install.sh --uninstall             # the CLI itself (or: npm uninstall -g recursive-praxis)
```

<br />

## Quick start

From a checkout:

```sh
npm install
npm test
npm run build
node dist/cli.js --help
```

Try the kernel directly, no credentials needed:

```sh
node dist/cli.js operators list
node dist/cli.js step --op Seed
node dist/cli.js status
```

`step` prints the resulting attractor. `status` prints the full session — `D`/`C`, mode, and the legal
next operators — which is the same data `lambda inject` briefs a host agent's context with every turn.

> For installed package use, the binary name is `lambda`.

<br />

## CLI commands

The binary is `lambda` (`node dist/cli.js` in a checkout). Full flags and examples live in
[docs/CLI_REFERENCE.md](docs/CLI_REFERENCE.md).

**Global**

| Command | Purpose |
|---|---|
| `lambda --help` / `-h` | Print the grouped command listing. |
| `lambda --version` / `-v` | Print the version. |

**Vocabulary and grammar** — the authored operator alphabet

| Command | Purpose |
|---|---|
| `lambda operators list` | List the 20 operator names with their symbols. |
| `lambda operators show <Op> [<Op>…]` | Print name, class, meaning, and effect for one or more operators, as JSON. |
| `lambda check <Op> [<Op>…]` | Hard-reject forbidden operator sequences. |

**Kernel** — the dissipation solver over `.recursive-praxis/session.json`

| Command | Purpose |
|---|---|
| `lambda status [--json]` | Attractor, `V`, `D`/`C`, `λ_eff`, mode, and `legalNext` for the session. |
| `lambda sense --d <n> --c <n> \| --from <json> [--json]` | Set the session's `D`/`C` state directly. |
| `lambda step [--op <Op>] [--json]` | Apply one operator; auto-picks the lowest-cost legal one if `--op` is omitted. |
| `lambda analyze <Op[,Op…]> [--json]` | `λ_eff`, trajectory, and warnings for an arbitrary sequence. |
| `lambda solve --initial D,C --target D,C [--beam-width N] [--json]` | Deterministic beam search between states. |
| `lambda diagnose [<problem>] [--json]` | Canned problem templates; run with no argument to list them. |
| `lambda halira start\|next\|status [--json]` | Drive or inspect the HALIRA Mode-2 escalation machine. |
| `lambda bind [--json]` | Finalize the session. Fails closed without an anomaly artifact; `--force` is rejected. |
| `lambda ir [--json]` | Print the current turn's instruction surface (`legalNext` only). |

`<problem>` is one of `stuck`, `overwhelmed`, `rigid`, `collapsed`, `procrastinating`, `spiraling`, `scattered`, `defensive`.

**Agent integrations**

| Command | Purpose |
|---|---|
| `lambda init [--tools claude,cursor,codex,opencode \| all \| none] [--scope project\|global] [--context-injection on\|off] [--json]` | Detect host agents, ask which to configure and at which scope, then generate host-native skill, command, and hook files that teach agents to call this CLI and brief their context every turn. Also records the context-injection setting in `.recursive-praxis/config.json`. Four questions on a terminal; the flags pre-answer them. |
| `lambda doctor [--scope project\|global] [--json]` | Verify an install: drift, orphans left by an earlier version, a manifest older than the CLI, and hosts that have since disappeared. Exits non-zero on any of them, so it works as a CI check. |
| `lambda sync [--scope project\|global] [--check] [--json]` | Regenerate every managed file from the install manifest. `--check` exits non-zero if anything would change, without writing. Alias: `lambda update` — note it refreshes generated **files**, not the `lambda` binary. |
| `lambda uninstall [--scope project\|global] [--tools <ids>] [--prune] [--json]` | Remove what `init` wrote. A file you appended to after the END marker is kept, and reported as kept. |

**Reserved (fail-closed)**

`record`, `validate`, `score`, and `revise` are not implemented. Each exits non-zero and emits no scores
or `λ_effective`.

<br />

## Core model

The kernel has **20 named operators**, including `Seed`, `Meta`, `Non`, `Weave`, `Ortho`, and `Kata`. A
session records the operator sequence, its state `{ D, C }`, its mode, anomaly artifacts, and whether it
is bound.

`bind` is the formal completion gate. It fails unless the sequence is non-empty, does not end on `Ana`,
contains a recorded anomaly artifact, and — when recovery is active — has reached HALIRA Recognition.

Normal planning uses a deterministic beam solver toward the stable target `{ D: 0.1, C: 0.1 }`.

```text
1st failed `lambda bind` in Mode 1  → mode1FailureCount + 1
2nd failed `lambda bind` in Mode 1  → HALIRA Mode-2 becomes available

Seed → Axis → Meta → Weave → Retro → Ortho → bind @ Recognition
```

<br />

## Safety and auditability

Enforcement is a `PreToolUse` hook, not a request to the agent: `lambda init` installs a hook that shells
out to `lambda gate` before every `Bash` call, which refuses a `lambda step --op <Op>` naming an operator
outside the current `legalNext` — the kernel's own `step()` enforces the same rule fail-closed, so the
hook is a latency optimization on an already-fail-closed check, not the only thing standing between the
agent and an illegal sequence.

A second hook, `lambda inject`, runs on every turn and briefs the agent's context with the session's mode,
attractor, and legal next operators — the mechanism that makes the sequence something the agent is told,
not something it has to remember or infer. It never blocks; refusing an illegal step is the gate's job.

<br />

## Documentation

| | |
|---|---|
| 🔤 [Vocabulary](docs/VOCABULARY.md) | How specification terms map to code identifiers |
| 💻 [CLI reference](docs/CLI_REFERENCE.md) | Full command and flag reference |
| 📦 [Installation architecture](docs/INSTALL_ARCHITECTURE.md) | Why install and `lambda init` are separate, and how hosts are detected |
| 🤝 [Contributing](CONTRIBUTING.md) | Development conventions |
| 🔒 [Security policy](SECURITY.md) | Reporting a vulnerability |
| 🗺️ [Exploratory roadmap](docs/explorations/RecursivePraxis_Roadmap.md) | Where this project is headed |

<br />

## Development

```sh
npm run build
npm test
npm run test:watch
```

The test suite uses Vitest and includes kernel, CLI, initialization, and runtime-safeguard coverage. See
[CONTRIBUTING.md](CONTRIBUTING.md) for development conventions.

<div align="center">
<br />
<sub>Controlled reasoning. Observable execution. Recoverable outcomes.</sub>
</div>
