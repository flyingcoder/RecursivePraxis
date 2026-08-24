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

### `diagnose` output

With a template name, `diagnose` prints the problem, its authored diagnosis, the
initial and target attractors, a suggested-operator line, and the solved
sequence:

```
problem: Stuck in infinite loop / analysis paralysis
diagnosis: Meta ∘ Meta loop (infinite reflection)
∅ -> S*
Suggested operators: Pro, Ortho, Weave, Seed

SUCCESS
sequence: Axis ∘ Telo ∘ Telo
```

`Suggested operators` lists the operators associated with that attractor
transition. It is **omitted entirely** when the pair has no mapping — most often
because the initial and target attractors are the same, as in
`procrastinating` (`S* -> S*`), where there is no transition to suggest.

These are a suggestion surface only. The solver does not consult them, and the
sequence it returns will often name none of them: they describe the transition,
while the sequence is fitted to the target coordinate.

Under `--json` the same list appears as `suggested`, a string array between
`targetAttractor` and `solution`:

```json
{
  "problem": { "description": "...", "initial": { "D": 0.85, "C": 0.75 }, "target": { "D": 0.3, "C": 0.35 }, "diagnosis": "..." },
  "initialAttractor": "∅",
  "targetAttractor": "S*",
  "suggested": ["Pro", "Ortho", "Weave", "Seed"],
  "solution": { "sequence": ["Axis", "Telo", "Telo"], "finalState": { "D": 0.33, "C": 0.43 }, "cost": 0.7654, "costBreakdown": { "...": 0 }, "success": true, "length": 3 }
}
```

`suggested` is `[]` rather than absent when there is no mapping, and no
pre-existing key changed shape when it was added.

## Agent integrations

Installing the CLI and configuring host agents are two separate steps. Installing
`lambda` touches no host agent; nothing reaches one until `lambda init` runs.

### `init`

```sh
lambda init                                        # four questions on a terminal
lambda init --tools claude,cursor --scope global   # no prompts, fully scripted
lambda init --tools all --scope project --json     # CI
lambda init --tools none
```

The four steps are: detect host agents, confirm which to configure, choose
project or global scope, generate. Any flag pre-answers its step and skips it;
the wizard prints the equivalent flag line on completion, and has no capability
a flag line does not.

Detection sets the default checkbox state only. Every host stays selectable,
including undetected ones — installing ahead of a host is legitimate. Scope is
never inferred: writing under `~` is a different act from writing in the
repository you are standing in, so it is always an explicit answer or an
explicit `--scope global`. Without a flag, scope is `project`.

Without a TTY, a missing `--tools` exits non-zero naming the flag rather than
defaulting silently.

| Host | Project scope | Global scope | Invocation |
|---|---|---|---|
| Claude Code | `.claude/skills/recursive-praxis-<id>/SKILL.md` + `.claude/commands/praxis/<id>.md` | `~/.claude/skills/recursive-praxis/` as a skills-directory plugin (`.claude-plugin/plugin.json` + `skills/<id>/SKILL.md`) | `/praxis:<id>` (project) · `/recursive-praxis:<id>` (global) |
| Cursor | `.cursor/skills/recursive-praxis-<id>/SKILL.md` + `.cursor/commands/praxis-<id>.md` | `~/.cursor/…` (same shape) | `/praxis-<id>` |
| Codex CLI | `.agents/skills/recursive-praxis-<id>/SKILL.md` | `~/.agents/skills/…` (**not** `~/.codex/skills/`) | `$recursive-praxis-<id>` |
| opencode | `.opencode/commands/praxis-<id>.md` | `~/.config/opencode/commands/praxis-<id>.md` | `/praxis-<id>` |

Writes cannot clobber: a file carrying the managed markers has only that region
replaced, anything appended after the END marker survives, and a file without
the markers is reported `skipped` and left untouched. `init` does not invoke
model execution as part of initialization.

What `init` wrote is recorded in an install manifest —
`.recursive-praxis/install.json` at project scope, `~/.recursive-praxis-cli/install.json`
at global scope — which is what makes the three commands below trustworthy
rather than guesses re-derived from a host table that drifts between releases.

Recorded hashes cover exactly what a re-run would overwrite: frontmatter through
the END marker. Content you append after the END marker is excluded, so keeping
the promise `init` made you never reads as drift.

**Committing the project-scope manifest.** It contains only project-relative
paths and content hashes — nothing machine-specific — so it is safe to commit,
and committing it is what lets `lambda doctor` and `lambda sync --check` run in
CI. `.recursive-praxis/` is otherwise machine-local session state, so un-ignore
just this file:

```gitignore
.recursive-praxis/
!.recursive-praxis/install.json
```

The global manifest is per-machine and is never committed.

### `doctor`

```sh
lambda doctor [--scope project|global] [--json]
```

Reports four things nothing else catches: a managed region edited by hand,
orphans left by a previous version, a manifest older than the CLI, and a host
whose files remain after the host itself has disappeared. Exits non-zero on any
of them, so it works as a CI check. It is also where detection evidence lands
in scriptable form — there is no separate `lambda detect`.

### `sync` (alias `update`)

```sh
lambda sync [--scope project|global] [--check] [--json]
```

Re-runs generation with the manifest's recorded hosts and scope, asking nothing.
`--check` exits non-zero if anything would change and writes nothing.

`update` is only an alias. It refreshes generated **files**, not the `lambda`
binary — upgrade that with `npm i -g recursive-praxis` or by re-running
`install.sh`.

### `uninstall`

```sh
lambda uninstall [--scope project|global] [--tools <ids>] [--prune] [--json]
```

Removes what the manifest records. A file is deleted only if it is in the
manifest, still carries both markers, and has nothing after the END marker —
anything appended means the file is yours now, and it is kept and reported as
kept. `--prune` removes only orphans, leaving the current install in place.
Directories emptied by the removal are pruned; ones we did not create are not.

The `lambda` binary itself is not removed: that is `install.sh --uninstall`,
`install.ps1 -Uninstall`, or `npm uninstall -g recursive-praxis`.

## Reserved commands

`record`, `validate`, `score`, and `revise` are intentionally unimplemented. Each exits non-zero and reports that status; they must not be used as if they produce measurements or modify runtime policy.

## JSON output

Commands marked `[--json]` return structured JSON suitable for scripts. Plain-text output is intended for interactive inspection.
