# CLI reference

The executable is named `lambda`. In a checkout, build first and invoke `node dist/cli.js`; when installed through the package bin, use `lambda` directly.

```sh
npm run build
node dist/cli.js --help
```

Most kernel commands persist one session at `.recursive-praxis/session.json` under the current working directory. `run` persists redacted task traces at `.recursive-praxis/traces/`.

## Planning and execution

| Command | Purpose |
| --- | --- |
| `lambda plan <task>` | Build a deterministic, budgeted operator plan without calling a model. |
| `lambda run [--host fake\|anthropic\|cursor\|claude-ide] <task>` | Execute a task through the selected model host and save a redacted trace. `fake` is the default. |
| `lambda inspect <task-id>` | Print a saved task trace. |
| `lambda replay <task-id>` | Check trace hash and semantic replay. Exits non-zero when not reproducible. |
| `lambda eval [--host ...]` | Run the authored three-domain capability benchmark. |
| `lambda promote <experimental-policy.json> <benchmark.json>` | Promote an experimental policy only when benchmark requirements are met. |

Example:

```sh
lambda run --host fake "Summarize the test failures"
lambda inspect <task-id>
lambda replay <task-id>
```

## Operator vocabulary and grammar

| Command | Purpose |
| --- | --- |
| `lambda operators list` | List the 20 operator names. |
| `lambda operators show <Op>` | Show authored metadata for one operator. |
| `lambda check <Op> [<Op>…]` | Validate an operator sequence against hard grammar constraints. |

## Session and kernel controls

| Command | Purpose |
| --- | --- |
| `lambda status [--json]` | Show the current session state, attractor, legal next operators, and HALIRA mode. |
| `lambda sense --d <n> --c <n> [--json]` | Set state directly; each value must be in `[0, 1]`. |
| `lambda sense --from <json> [--json]` | Set state from a JSON file containing `D` and `C`. |
| `lambda step [--op <Op>] [--json]` | Apply a legal operator. With no `--op`, choose the legal lowest-cost candidate. |
| `lambda analyze <Op[,Op…]> [--json]` | Report λ analysis, trajectory, and warnings for a sequence. |
| `lambda compile <Op[,Op…]> [--bindings <file>] [--json]` | Compile a sequence into a cognitive execution program: one instruction per operator run, each carrying its capability grant and execution budget. Prototype — see [suggestions/operator-sequence-to-execution-language.md](suggestions/operator-sequence-to-execution-language.md). |
| `lambda solve --initial D,C --target D,C [--beam-width N] [--json]` | Run the deterministic beam solver. |
| `lambda diagnose [<stuck\|overwhelmed\|rigid\|collapsed\|procrastinating>] [--json]` | List or solve authored diagnostic templates. |
| `lambda halira start\|next\|status [--json]` | Control or inspect the HALIRA recovery state machine. |
| `lambda bind [--json]` | Attempt formal completion. `--force` is rejected by design. |
| `lambda ir [--json]` | Render the current session’s instruction surface. |

Examples:

```sh
lambda sense --d 0.5 --c 0.5
lambda step --op Non
lambda step --op Kata
lambda bind
```

## Agent integrations

```sh
lambda init --tools claude,cursor,codex
lambda init --tools all
lambda init --tools none
```

`init` writes host-native skill and command files that teach an agent to use the cognition CLI. It does not invoke model execution as part of initialization.

## Reserved commands

`record`, `validate`, `score`, and `revise` are intentionally unimplemented. Each exits non-zero and reports that status; they must not be used as if they produce measurements or modify runtime policy.

## JSON output

Commands marked `[--json]` return structured JSON suitable for scripts. Plain-text output is intended for interactive inspection.
