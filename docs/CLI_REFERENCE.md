# CLI reference

The executable is named `lambda`. In a checkout, build first and invoke `node dist/cli.js`; when installed through the package bin, use `lambda` directly.

```sh
npm run build
node dist/cli.js --help
```

Most kernel commands persist one session at `.recursive-praxis/session.json` under the current working directory.

## Operator vocabulary and grammar

| Command | Purpose |
| --- | --- |
| `lambda operators list` | List the 20 operator names. |
| `lambda operators show <Op> [<Op>…]` | Print name, class (with the formalism's characteristics and commutation bias), meaning, effect, any attractor the operator projects onto, and every algebra statement naming it, as JSON. |
| `lambda check <Op> [<Op>…]` | Validate an operator sequence against hard grammar constraints. |

## Session and kernel controls

| Command | Purpose |
| --- | --- |
| `lambda status [--json]` | Show the current session state, attractor (with what that attractor means, and the stated escape operators when in the void), legal next operators, and HALIRA mode. |
| `lambda sense --d <n> --c <n> [--json]` | Set state directly; each value must be in `[0, 1]`. |
| `lambda sense --from <json> [--json]` | Set state from a JSON file containing `D` and `C`. |
| `lambda step [--op <Op>] [--json]` | Apply a legal operator. With no `--op`, choose the legal lowest-cost candidate. |
| `lambda analyze <Op[,Op…]> [--json]` | Report λ analysis, trajectory, warnings, the attractors the trajectory visits (in the formalism's words, including the void's stated escape operators), and the formalism's algebraic reading of the sequence's adjacent pairs. The reading is descriptive: it never rewrites, shortens, or reorders the sequence (see `docs/ALGEBRA_DYNAMICS_SEAM.md` §2). |
| `lambda compile <Op[,Op…]> [--bindings <file>] [--json]` | Compile a sequence into a cognitive execution program: one instruction per operator run, each carrying its capability grant and execution budget. Prototype — see [suggestions/operator-sequence-to-execution-language.md](suggestions/operator-sequence-to-execution-language.md). |
| `lambda solve --initial D,C --target D,C [--beam-width N] [--json]` | Run the deterministic beam solver. |
| `lambda diagnose [<stuck\|overwhelmed\|rigid\|collapsed\|procrastinating\|spiraling\|scattered\|defensive>] [--json]` | List or solve authored diagnostic templates. |
| `lambda task [<git-commit\|documentation\|meta-prompting\|mindset\|code-review>] [--json]` | List or solve authored task templates for recurring work — same mechanism as `diagnose`, keyed to a task rather than a psychological state. |
| `lambda halira start\|next\|status [--json]` | Control or inspect the HALIRA recovery state machine. |
| `lambda bind [--json]` | Attempt formal completion. `--force` is rejected by design. |
| `lambda ir [--json]` | Render the current session’s instruction surface. |
| `lambda gate` | PreToolUse hook body, not normally run by hand: reads a hook payload from stdin and, for a `lambda step --op <Op>` shell call, exits `2` (block) if `<Op>` is outside `legalNext` or the session is already bound, `0` (allow) otherwise. Every other shell command, and any payload it cannot parse, is allowed through unexamined — this is enforcement layered on `step()`'s own fail-closed check (`src/kernel/session.ts`), not a replacement for it. Installed as the `legality-gate` hook by `lambda init`. |
| `lambda inject` | UserPromptSubmit hook body, not normally run by hand: reads a hook payload from stdin and prints a briefing of the session's mode, attractor, λ_eff, and legal next operators for the host to prepend to the turn. Never blocks — `continue` is always `true`. Switch it off with `lambda init --context-injection off`. Installed as the `context-injection` hook by `lambda init`. |

Examples:

```sh
lambda sense --d 0.5 --c 0.5
lambda step --op Non
lambda step --op Kata
lambda bind
```

`analyze` and `compile` accept either separator, so a chain can be pasted in
the formalism's own notation:

```sh
lambda compile "Axis,Ana,Pro,Para,Kata,Latch"
lambda compile "Axis ∘ Ana ∘ Pro ∘ Para ∘ Kata ∘ Latch"
```

An illegal chain is rejected, never repaired: `lambda compile "Axis,Ana"` exits
non-zero citing `end-on-ana`, because the formalism forbids ending on an
operator that leaves the work abstract.

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

### `task` output

`lambda task` is the same mechanism as `diagnose` — an authored initial/target
D,C pair looked up by key and run through the same solver — pointed at
recurring work instead of a psychological state: `git-commit`, `documentation`,
`meta-prompting`, `mindset`, `code-review`. `--json` output is identical in
shape to `diagnose`'s, with two differences: the top-level `problem` object
carries a `rationale` field (an authored line naming the operator imbalance
the transition corrects) rather than `diagnosis`, and text output prints
`task: ...` / `rationale: ...` in place of `problem: ...` / `diagnosis: ...`.
Everything else — `initialAttractor`, `targetAttractor`, `suggested`,
`solution` — is unchanged from `diagnose` above.

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
| Claude Code | `.claude/skills/recursive-praxis-<id>/SKILL.md` + `.claude/commands/praxis/<id>.md` + a `hooks` entry spliced into `.claude/settings.json` | `~/.claude/skills/recursive-praxis/` as a skills-directory plugin (`.claude-plugin/plugin.json` + `skills/<id>/SKILL.md` + `hooks/hooks.json`) | `/praxis:<id>` (project) · `/recursive-praxis:<id>` (global) |
| Cursor | `.cursor/skills/recursive-praxis-<id>/SKILL.md` + `.cursor/commands/praxis-<id>.md` + a `beforeShellExecution` entry spliced into `.cursor/hooks.json` | `~/.cursor/…` (same shape) | `/praxis-<id>` |
| Codex CLI | `.agents/skills/recursive-praxis-<id>/SKILL.md` + a `PreToolUse` entry spliced into `.codex/hooks.json` | `~/.agents/skills/…` (**not** `~/.codex/skills/`) + `~/.codex/hooks.json` | `$recursive-praxis-<id>` |
| opencode | `.opencode/commands/praxis-<id>.md` | `~/.config/opencode/commands/praxis-<id>.md` | `/praxis-<id>` |

**The legality gate.** `init` installs `lambda gate` as a real pre-execution
hook, so an illegal `lambda step --op <Op>` shell call is refused before it runs
rather than after. Three of the four hosts get it, each in its own dialect:

| Host | Where | Event | Entry |
|---|---|---|---|
| Claude Code | plugin `hooks/hooks.json` (global) · `.claude/settings.json` (project) | `PreToolUse` | matcher group, `matcher: "Bash"` |
| Codex CLI | `.codex/hooks.json` | `PreToolUse` | matcher group, `matcher: "Bash"` — identical to Claude Code's |
| Cursor | `.cursor/hooks.json` (plus its `"version": 1`) | `beforeShellExecution` | flat `{type, command, matcher}`, `matcher: "lambda"` |

Only Claude Code's global scope is a whole file, because only there is the file
ours — it lives inside our own plugin directory. Every other target is a config
file you own, so a single entry is spliced in and everything around it survives.
Cursor's `"version"` is written only if the file does not already have one, is
never overwritten, and is never removed on uninstall: we need it, but it is not
ours, and deleting it would break the hooks of yours we deliberately leave.

The three disagree about the file, the event name, the entry shape, and what
`matcher` even means — Claude Code and Codex match it against the tool name,
Cursor against the command line — but they agree on the two things one gate
needs: the command arrives as JSON on stdin, and exit code 2 blocks it. `lambda
gate` reads both payload shapes (`tool_input.command` for Claude Code and Codex,
a root-level `command` for Cursor).

**opencode gets no hook.** Its equivalent surface is a JavaScript plugin module
in `.opencode/plugin/` exporting a `tool.execute.before` function; there is no
configuration route for running an external command, so installing the gate
there would mean generating executable JavaScript rather than a config entry.
That is a different kind of artifact from anything `init` writes today, so it is
not attempted rather than guessed at.

**Context injection.** `init` also installs `lambda inject` as a `UserPromptSubmit`
hook, so a host agent's context is briefed with the session's mode, attractor,
and legal next operators on every turn, rather than left to be remembered. Two
of the four hosts get it:

| Host | Where | Event | Entry |
| --- | --- | --- | --- |
| Claude Code | plugin `hooks/hooks.json` (global) · `.claude/settings.json` (project) | `UserPromptSubmit` | matcher group, no `matcher` (the event has no tool-name axis) |
| Codex CLI | `.codex/hooks.json` | `UserPromptSubmit` | matcher group, no `matcher` — identical to Claude Code's |

**Cursor and opencode get no context-injection hook.** Cursor's equivalent event,
`beforeSubmitPrompt`, supports only `continue`/`user_message` in its current hook
schema — `user_message` is shown only when the hook blocks the turn, and there is
no field for prepending context to an allowed one. Rather than force a briefing
through a mechanism built for refusal, the hook is simply not installed there —
the same "a host with no place for a hook kind gets none" posture the gate
section above documents for opencode. Both hosts still get the gate.

Writes cannot clobber: a file carrying the managed markers has only that region
replaced, anything appended after the END marker survives, and a file without
the markers is reported `skipped` and left untouched. A shared JSON file —
`.claude/settings.json`, a host's `hooks.json`, or an `.mcp.json` holding your
own servers — is spliced rather than written: only our own entries are added
(`hooks.<Event>` is an array, so ours is appended beside any hook of yours for
the same event), every other byte survives, a
second `init` adds no duplicate, `uninstall` removes that entry alone, and a file
we cannot parse is reported and left untouched. `init` does not invoke model
execution as part of initialization.

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

## CLI vs. MCP tool fit

`lambda mcp` already exposes five tools — `derive_initial_state`, `plan_arc`,
`numbers_for_label`, `verify_arc` ([src/mcp/tools.ts](../src/mcp/tools.ts)) and
`read_chain_algebra` ([src/ir/chainReading.ts](../src/ir/chainReading.ts)).
All five share one shape: pure, stateless-of-the-filesystem, Zod-validated JSON
in, JSON out. That shape is the yardstick below, applied to every CLI verb.

**This is an evaluation, not a removal list.** Nothing here proposes deleting a
CLI form. Three things can only ever be reached by shell invocation, no matter
what else exposes the same computation as a tool: a human typing at a
terminal, a host's hook runner (`gate`), and `init`/`doctor`/`sync`/`uninstall`
writing or checking files on disk. "MCP-worthy" below means *also* expose it
as a tool; it never means *only*.

| Command | Verdict | Why |
| --- | --- | --- |
| `operators list` | CLI-only | Static reference list a human reads; a reasoning agent already gets per-operator meaning through `legalNext` in `status` and through `read_chain_algebra` for whatever chain is actually in play. |
| `operators show <Op…>` | **MCP-worthy** | Pure, stateless, JSON-shaped exactly like the existing derive tools. No reason a host agent should shell out and parse text for this. |
| `check <Op…>` | **MCP-worthy** | Pure grammar validation, same class as `read_chain_algebra`. Lets an agent validate a chain it is composing before it ever reaches `step`. |
| `status [--json]` | **MCP-worthy** | Read-only over the session file, no side effects. Every shipped skill's first instruction is "run `lambda status --json`" ([suggestions/commands-and-skills-split.md](suggestions/commands-and-skills-split.md) §7.2) — this is the hottest path in the whole surface, and today it costs a subprocess plus stdout parsing per call. |
| `sense --d/--c \| --from` | **MCP-worthy** | Writes the session file directly, but deterministically — the natural write-back partner to `derive_initial_state`, which only computes the pair and never persists it. |
| `step [--op] [--json]` | **MCP-worthy** | Mutates the session, but legality is enforced *inside* `step()` itself, fail-closed ([src/kernel/session.ts](../src/kernel/session.ts)) — the `gate` hook is a second layer on top of the shell route specifically, not the source of truth (see above). An MCP tool call reaches that same fail-closed check directly, with one enforcement point valid for every host — including opencode, which the hook table above documents as receiving *no* hook at all today. |
| `analyze <chain> [--json]` | **MCP-worthy** | Pure, stateless, deterministic — no session read. Same computation class as `verify_arc`. |
| `compile <chain> [--bindings] [--json]` | **MCP-worthy** | Pure, stateless, deterministic (labelled Prototype in this doc already). No filesystem or session dependency. |
| `solve --initial --target [--json]` | **MCP-worthy** | Pure, stateless beam search — literally the function `verify_arc` already calls internally. Exposing it directly saves round-tripping through `verify_arc`'s label-claim wrapper when no claim needs checking. |
| `diagnose [<template>] [--json]` | **MCP-worthy** | Canned-template lookup plus solve, pure and stateless. Same shape as `solve`. |
| `task [<template>] [--json]` | CLI-only, for now | Same computation shape as `diagnose` — canned-template lookup plus solve, pure and stateless — so it qualifies by the same rule; not yet wired into the MCP tool set. |
| `halira start\|next\|status [--json]` | **MCP-worthy** | Session-mutating state machine, same argument as `step`: the kernel's own fail-closed check is the enforcement, not the shell layer around it. |
| `bind [--json]` | **MCP-worthy** | Same argument as `step`/`halira` — finalization is checked inside the kernel (anomaly artifact, legal ending, Mode-2 recognition), so a direct tool call is no less safe than the CLI route and removes a subprocess from the one path every task ends on. |
| `ir [--json]` | **MCP-worthy** | Read-only render of `legalNext` over the session. Cheap, safe, no reason to shell out for it. |
| `gate` | CLI-only, structurally | Not reachable through tool-calling at all — it is invoked *by* a host's own hook runner (`PreToolUse` / `beforeShellExecution`) as a subprocess, before the model ever gets a turn. There is no "MCP" form of a pre-execution hook body. |
| `inject` | CLI-only, structurally | Same argument as `gate`: invoked *by* a host's own hook runner (`UserPromptSubmit`), before the model sees the turn it is briefing. An MCP tool call happens mid-task, after the model already has a turn — it cannot inject context ahead of one. |
| `mcp` | CLI-only, structurally | This is the command that *starts* the MCP server. It cannot also be one of the tools it serves. |
| `init [--tools …] [--scope …]` | CLI-only | Interactive wizard / scripted install that writes skill, command, and hook files across up to four hosts and two scopes. Administrative, run once per setup, needs TTY-or-flags handling a tool call gains nothing from replicating. |
| `doctor [--scope …] [--json]` | CLI-only | CI-style drift/orphan check against the install manifest. No reasoning-time value; belongs next to `sync --check` in a pipeline, not in a task's tool list. |
| `sync` (alias `update`) [--scope …] [--check] [--json] | CLI-only | Regenerates managed install files from the manifest — side-effecting filesystem writes, administrative. |
| `uninstall [--scope …] [--tools …] [--prune] [--json]` | CLI-only | Destructive by design. A hallucinated or misfired tool call must never be able to delete a host's integration files; this stays behind an explicit human shell invocation. |
| `record` / `validate` / `score` / `revise` | N/A — reserved | Deliberately unimplemented. Neither surface is appropriate until the measurement authority they need exists. |

**The pattern.** Everything that reads or writes `.recursive-praxis/session.json`
and enforces its own legality — `status`, `sense`, `step`, `analyze`, `compile`,
`solve`, `diagnose`, `halira`, `bind`, `ir` — is MCP-worthy, because the kernel's
fail-closed checks live inside the functions these commands call, not in the
CLI layer or the `gate` hook wrapped around it. Everything that governs the
install itself, or is structurally invoked by a host's own hook runner rather
than by tool-calling — `init`, `doctor`, `sync`, `uninstall`, `gate`, `inject`,
`mcp` — is CLI-only, because it is either administrative, or incapable of being
reached through a tool call in the first place.

## JSON output

Commands marked `[--json]` return structured JSON suitable for scripts. Plain-text output is intended for interactive inspection.
