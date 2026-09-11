# Feature Inventory

A historical-record cross-check: what the code in this repository actually does, verified against on-disk source and real call/registration graphs, held up against [`THE_IDEA.md`](../THE_IDEA.md) — the developer's own account, in his own words, of what this project is for.

**Method.** Every claim below is grounded in source: a function is "wired" only if a real caller was found by grep/read, not inferred from a comment; an asset is "agent-discoverable" only if it appears in one of `SKILLS`/`COMMANDS`/`AGENTS`/`RULES`/`HOOKS`/`MCP_SERVERS` (`src/init/*/index.ts`); a CLI command is "reachable" only if it has a branch in `src/cli.ts`'s `main()`. Where THE_IDEA.md makes a claim, this document checks it against the cited file rather than repeating it. Docs (`docs/*`, code comments) are read as *stated intent*, never as ground truth for *current behavior* — per THE_IDEA.md's own instruction to read it "as intent, not as documentation," and per this project's `CLAUDE.md`/`AGENTS.md` convention of trusting code over docs.

**As of**: 2026-09-11, branch `main`, HEAD `10fc1d4` — a clean working tree except one small in-flight fix (see §5's last entry). This revision supersedes the 2026-09-10 audit below: the codebase went through the pivot §3.1 of that audit flagged as its "headline finding" — `src/engine/*`, the code THE_IDEA.md names as the literal Lambda Engine, has been deleted and replaced with a different mechanism. §1 and §5 record that transition; the rest of this document re-verifies everything else against current source rather than assuming the prior audit still holds.

---

## 1. The headline finding, revisited: the Lambda Engine was rebuilt, and THE_IDEA.md now cites a file that no longer exists

The prior audit's finding was that THE_IDEA.md ([`THE_IDEA.md:44-48`](../THE_IDEA.md#L44)) describes "Lambda engine" as mandatory enforcement "through state transition... enforced through always true AI rules," citing [`src/init/hooks/legality-gate.ts`](../src/init/hooks/legality-gate.ts) — while the literal `src/engine/*` files THE_IDEA.md also names as "the whole idea of 'lambda engine'" ([`THE_IDEA.md:25`](../THE_IDEA.md#L25)) were a separate, agent-excluded planner that called its own model per operator step, with no relation to the citation.

That mismatch has been resolved by deletion, not by renaming. `src/engine/core.ts`, `orchestrator.ts`, and `evaluation.ts` — along with the four model-host transports in `src/adapters/` they drove and the `lambda plan/run/inspect/replay/eval/promote` commands they backed — are gone from the tree entirely (commit `f2b4f10`). The investigation that led to their removal traced the *original* pre-port Lambda Engine, preserved verbatim at [`docs/inspirations/lambda-engine/dot-cursor/`](../docs/inspirations/lambda-engine/dot-cursor/), and found its real mechanism was never tool-blocking: it was a `beforeSubmitPrompt` hook injecting mode/operator guidance into every turn, plus `.mdc` rule files marked `alwaysApply: true` that were unconditionally loaded into context every turn. `src/engine/*`'s nested-model executor wasn't a port of that — or of anything else in the original design.

In its place: [`src/cli-commands/inject.ts`](../src/cli-commands/inject.ts) (`lambda inject`) is a new `UserPromptSubmit` hook, installed by `lambda init` as the `context-injection` hook ([`src/init/hooks/context-injection.ts`](../src/init/hooks/context-injection.ts)), that reads the live kernel session and prints the current mode, attractor, `λ_eff`, and legal next operators as context prepended to every turn ([`src/cli-support/session-briefing.ts`](../src/cli-support/session-briefing.ts)). This is a deliberate, closer mechanization of what the original Cursor rules actually did than `src/engine/*` ever was — built from the live `Session` the kernel already tracks, not static prose.

**What this leaves accurate vs. stale in THE_IDEA.md itself:**

- The state-transition enforcement citation (`legality-gate.ts`, [`THE_IDEA.md:48`](../THE_IDEA.md#L48)) is unchanged and still correct in the same sense the prior audit found: `legalNext` lives in `src/kernel/session.ts`, not `src/engine/*`, and the hook is a latency layer on top of `step()`'s own fail-closed check, not the sole enforcement.
- The `src/engine/` citation at [`THE_IDEA.md:60`](../THE_IDEA.md#L60) — "the current deterministic planning/execution/evaluation code" — now names a directory that does not exist. THE_IDEA.md is explicitly the developer's own words, flagged in its own attribution notice as not something an AI agent should rewrite ([`THE_IDEA.md:3`](../THE_IDEA.md#L3)); this is recorded here as a finding for the developer to act on, not corrected in place.
- Nothing in THE_IDEA.md yet names `lambda inject` or the `context-injection` hook — the file predates the rebuild it would now most directly describe.

## 2. THE_IDEA.md concept → code, as it actually stands

| THE_IDEA.md concept | What THE_IDEA.md says implements it | What the code shows actually implements it |
|---|---|---|
| **Lambda Engine** (reasoning guide via 20 operators, forced on the agent) | `src/engine/*` (file deleted) | Two real mechanisms, neither named `src/engine/`: (1) `src/kernel/session.ts` + the `legality-gate` `PreToolUse` hook — fail-closed blocking of an illegal `lambda step` call; (2) `src/cli-support/session-briefing.ts` + the `context-injection` `UserPromptSubmit` hook (`lambda inject`) — unconditional per-turn context injection of the session's mode/attractor/legal moves. The second is new since the prior audit and is architecturally the closer match to THE_IDEA.md's "always true AI rules" framing. |
| **Praxis Workflow** (intent → diagnose → analyze → execute) | `src/init/skills/intent.ts`, `diagnose.ts`, `analyze.ts` | Unchanged from the prior audit: accurate for steps 1–4. Step 5 in `intent.ts` is "render the sequence as instructions," not a distinct step-6 "execute" asset — execution is an implicit continuation the model is trusted to do, unenforced by any hook or gate. `task.ts` and `derive.ts` are equally load-bearing and still unnamed by THE_IDEA.md. |
| **RecursivePraxis / `lambda diagnose`** | `src/assets/problem_templates.json`, diagnoses "AI Agent problems" | Unchanged: accurate, and the cleanest, best-tested pattern in the repo. `lambda task` / `task_templates.json` remains an undocumented structural sibling (see §3.2). |
| **AI Recursive Framework / REE** | Python quarry, "inspiration only" | Not audited here — out-of-repo prior art per THE_IDEA.md and [`src/assets/NOTICE.md`](../src/assets/NOTICE.md). |

---

## 3. Debt, redundancy, and inert-code ledger

Ordered roughly by how much it affects an actual AI agent's behavior, most consequential first. Items resolved since the prior audit are marked **RESOLVED** and kept for the historical record rather than deleted outright.

### 3.1 RESOLVED — `src/engine/*` unreachability

The prior §3.1 ("`src/engine/*` is fully unreachable from any AI-agent-facing surface") is moot: the code it described no longer exists. See §1 and §5.

### 3.2 `lambda task` is a structural clone of `lambda diagnose`, and isn't in THE_IDEA.md

- **What**: `src/cli-commands/task.ts` reimplements `diagnose.ts`'s exact pipeline (lookup → `classifyAttractor` ×2 → `suggestTransitionOperators` → `solve` → print) against a second JSON file (`task_templates.json`) with fields renamed (`diagnosis`→`rationale`). Still a line-for-line structural match.
- **Verdict**: unchanged from the prior audit — duplicate-of-`diagnose.ts`, well-tested, properly installed as a skill, but a second bespoke implementation of the same four-step pipeline where a shared helper would remove the duplication.
- **Evidence**: `src/cli-commands/task.ts` vs `src/cli-commands/diagnose.ts`.

### 3.3 One genuine duplicate function inside the kernel

- **What**: `src/kernel/constraints.ts:49` defines its own `legalNext(sequence)`, doing the identical `OPERATORS.filter(op => !violatesHardConstraint(...))` filter that `src/kernel/session.ts:12-15` reimplements inline for its Mode-1 case, under the same name but a different signature (`sequence` vs. `Session`).
- **Verdict**: unchanged — duplicate. `constraints.ts`'s version is not exported from the `kernel/index.ts` barrel and has zero callers in `src/`; only its own test reaches it directly.
- **Evidence**: `src/kernel/constraints.ts:48-51`; `src/kernel/session.ts:9-15`.

### 3.4 A dangling reference from an earlier, unrelated feature removal

- **What**: `src/ir/chainReading.ts:24-26`'s module doc comment still says *"The composed-prompt path deliberately does not consume this... see the same pseudocode file"* — referring to `src/ir/promptPolicy.ts` and a `.psuedo` file, both deleted in the meta-prompt/prompt-policy removal recorded in the prior audit's §5. Unrelated to the Lambda Engine rebuild; still present.
- **Verdict**: stale comment, harmless at runtime.
- **Evidence**: `src/ir/chainReading.ts:24-26`.

### 3.5 One dead exported function

- **What**: `src/vocab/execution-classes.ts:66`'s `executionModeForClass` still has zero callers anywhere in `src/` or `tests/`. Its own module immediately wraps it into `executionMode`, which is the function actually used everywhere.
- **Verdict**: unchanged — inert, unreachable, no test coverage even indirectly.
- **Evidence**: `src/vocab/execution-classes.ts:66-72`.

### 3.6 An inert install-pipeline class, built ahead of need

- **What**: `src/hosts/layouts.ts`'s `CompositeLayout` (~line 447) still has zero instantiations anywhere in `src/` or `tests/`. All four current host adapters use other layout classes; the scenarios its docstring names are handled by fragment-splicing instead.
- **Verdict**: unchanged — dead code documenting an anticipated need the codebase solved a different way.
- **Evidence**: `src/hosts/layouts.ts:447` (the unused class), `src/hosts/layouts.ts:~172` (the fragment-splicing approach that superseded it).

### 3.7 Reserved-verb stubs — intentional, not accidental debt

- **What**: `src/record/`, `src/validate/`, `src/score/`, `src/revise/` are each a one-function stub, imported into `src/cli.ts` but dispatched from no CLI branch — unreachable by design.
- **Verdict**: unchanged — **not debt**. [`CONTRIBUTING.md`](../CONTRIBUTING.md) documents these as intentionally unimplemented, requiring separately defined authority before implementation.
- **Evidence**: `src/record/index.ts` (and siblings); `CONTRIBUTING.md` §Scope and posture.

### 3.8 Self-declared inert research instruments — intentional, not accidental debt

- **What**: `src/kernel/degeneracy.ts` (`degeneracyReport`), `src/kernel/selectionStudy.ts` (`compareTransitionFilter`), `src/kernel/phasePortrait.ts` (`analyzeBasinStructure`), `src/kernel/commutator.ts` (`commutatorPairCount`) remain exported, tested, and called by nothing in `src/`.
- **Verdict**: unchanged — **not debt**; each module's own doc comment says so explicitly. Measurement tooling for the developer, never intended to reach a CLI surface.
- **Evidence**: `src/kernel/degeneracy.ts:42-58`; `src/kernel/selectionStudy.ts:69-89`.

### 3.9 `lambda compile` — wired, tested, but outside the agent-facing skill surface

- **What**: `src/ir/execution.ts`'s `compileExecutionProgram` backs `lambda compile` (now its own `src/cli-commands/compile.ts`, dispatched at `src/cli.ts:334` — a cleaner shape than the prior audit's inline dispatch, though the underlying gap is unchanged). Unlike `analyze`/`status`/`ir`/`solve`/`diagnose`/`task`/`session`, there is still no `src/init/skills/compile.ts`.
- **Verdict**: unchanged — reachable by a human or an MCP client that already knows the function name, invisible to an agent following the installed skill surface.
- **Evidence**: `src/ir/execution.ts:111-132`; `src/cli-commands/compile.ts`; confirmed absent via `src/init/skills/index.ts`.

### 3.10 Documentation drift inside the asset system itself — now further off

- **What**: `src/init/assets/ProseAsset.ts:69` and `src/init/README.md:66` both still say *"The seven kernel commands are currently word-for-word their matching skills"*. `SKILLS`/`COMMANDS` (`src/init/skills/index.ts`, `src/init/commands/index.ts`) hold **nine** entries each, and confirmed by grep, all nine — not seven — are built via `Command.mirroring()`. The prior audit already found this stale at "should say nine"; it is unchanged since, so the comment is now further from correct than when first flagged, not closer.
- **Verdict**: stale, behavior-harmless, easy fix, not yet fixed.
- **Evidence**: `src/init/assets/ProseAsset.ts:69`; `src/init/README.md:66`; `src/init/skills/index.ts`; `grep -l "Command.mirroring" src/init/commands/*.ts` → 9 files.

### 3.11 RESOLVED — the `hosts/` vs. `adapters/` naming collision

The prior §3.11 flagged `src/hosts/*Adapter.ts` (install-time) and `src/adapters/*-transport.ts` (runtime model transports) as sharing the word "host" pervasively despite being unrelated. `src/adapters/` no longer has transports to collide with — it is now one file, `schemas.ts`, holding only the structured-output schema for a translator model's instruction bindings (`src/ir/execution.ts`'s domain), unrelated to any host at all. The collision is gone because one side of it was deleted, not because anything was renamed.

- **Evidence**: `ls src/adapters/` → `schemas.ts` only.

### 3.12 RESOLVED — untested model-transport branches

The prior §3.12 listed `cursor-transport.ts`, `claude-ide-transport.ts`, and `anthropic-transport.ts` as real, untested `resolveHost()` branches. `resolveHost()` and all four transports are deleted along with `src/engine/*`; there is no longer a coverage gap because there is no longer code to cover.

**A methodology note carried forward from the prior audit**: codegraph's static test-coverage detector has previously flagged genuinely-covered code (reached only through a registry/factory indirection or a `unified().use(...)` pipeline) as untested. Verify any "no coverage" flag by reading the tests, not by trusting the tool.

---

## 4. Full per-subsystem inventory

### 4.1 `src/kernel/` — the formal operator model and state machine (15 files, ~2279 lines)

The actual substrate of "the 20 controlled rupture operators" and the real state-transition enforcement, despite being unnamed as such anywhere in THE_IDEA.md.

| File | Role | Wired? | Verdict |
|---|---|---|---|
| `types.ts`, `index.ts` | Operator alphabet, `Session`/`DissipationState` types, public barrel | Yes, universal | clean |
| `session.ts` | `legalNext`, `step`, `bind`, HALIRA Mode-2 escalation — the real enforcement THE_IDEA.md attributes to `legality-gate.ts` | Yes — `cli-commands/gate.ts`, `step.ts`, `ir/compile.ts`, etc. | clean (see §1) |
| `constraints.ts` | `violatesHardConstraint`, `violatesSequenceEndConstraint`, `trailingRunLength` | Yes | clean, except its own `legalNext` — see §3.3 |
| `halira.ts` | Mode-2 recovery step table | Yes — `session.ts`, `ir/compile.ts` | clean |
| `commutator.ts` | Reads vendored `\|η_ij\|` magnitudes | `commutatorMagnitude` yes; `commutatorPairCount` no (see §3.8) | mostly clean |
| `dissipation.ts` | λ-cost model over a sequence | Yes — `solver.ts`, `cli-support/suggest-operator.ts`, `cli-support/session-briefing.ts`, `cli-support/status-payload.ts`, `cli-commands/analyze.ts`, several installed skills | clean; documents a fixed historical formula bug. Caller set changed since the prior audit — `engine/core.ts` (deleted) replaced by the new `cli-support/*` briefing/suggestion code. |
| `derive.ts` | Deterministic intent→initial-state mapping, "no invented measurement" | Yes — `mcp/tools.ts`, `intentArc.ts` | clean, self-audited. `engine/core.ts` (deleted) has been removed from its caller set; the intent-derivation path was always the other caller and is unaffected. |
| `phasePortrait.ts` | Attractor classification, Lyapunov dynamics, transition suggestions | Mostly yes; `analyzeBasinStructure` no (see §3.8) | mostly clean; two transition tables coexist by documented design |
| `intentArc.ts` | `planArc`/`verifyArc`/`numbersForLabel` — deterministic half of intent→arc derivation | Yes — `mcp/tools.ts` | clean |
| `selectionStudy.ts`, `degeneracy.ts` | Self-declared research instruments | No (deliberately) — see §3.8 | not debt |
| `solver.ts` | Beam-search A* toward a target (D,C) | Yes, widely | clean; documents a fixed historical ranking-key bug |
| `formalism.ts` | Typed reader for `formalism.json` — single source of truth for operator/algebra data | Yes, universal | clean; documents a fixed "half-wired constants" bug |
| `algebra.ts` | Parses `algebra_relations` into queryable statements; explicitly "not enforced, must not become enforcement" | Yes — `cli.ts`, `ir/chainReading.ts` | clean |

### 4.2 The Lambda Engine, rebuilt: `src/cli-support/session-briefing.ts` + the `context-injection` hook

Replaces the prior audit's §4.2 (`src/engine/` — now deleted, see §1).

| Piece | Role | Wired? |
|---|---|---|
| `src/cli-support/session-briefing.ts` (`SessionBriefing`) | Composes `statusPayload` and `AttractorVocabulary` into the few lines a host prepends to a turn: mode, attractor, `λ_eff`, legal next operators, a suggested operator. Authors no operator vocabulary of its own — sources `operatorMeaning()` from `kernel/formalism.ts`, the single source of truth. | Yes — `cli-commands/inject.ts` |
| `src/cli-support/suggest-operator.ts` (`pickPolicyOperator`) | The fast-clock lowest-cost-transition heuristic, extracted out of `step.ts` so `inject`'s "suggested" line and an unflagged `lambda step`'s actual choice can never drift apart. | Yes — `cli-commands/step.ts`, `cli-support/session-briefing.ts` |
| `src/cli-commands/inject.ts` (`runInject`, `lambda inject`) | Reads a `UserPromptSubmit` hook payload from stdin, loads the session, and prints `{"continue": true, "hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": ...}}`. Never blocks. Gated by the `contextInjection` setting — `off` prints nothing. Fails open (silent) on an unparseable payload or unreadable config, same posture as `gate.ts`. | Yes — dispatched at `src/cli.ts:394` |
| `src/init/hooks/context-injection.ts` | The `Hook` asset (`event: "UserPromptSubmit"`, `command: "lambda inject"`), registered in `HOOKS` alongside `legality-gate`. | Yes — installed by `lambda init` for Claude Code and Codex CLI; deliberately omitted for Cursor (its `beforeSubmitPrompt` schema has no additive-context field, only `user_message` shown when blocking) and opencode (no hook surface of any kind) — see `docs/CLI_REFERENCE.md`'s hook-wiring table. |
| `src/config/settings.ts` | Reduced from eight model-host/model-name/secret descriptors to one: `contextInjection` (`"on"` default, `"off"`). The secret-from-environment layer is gone entirely — there is no longer a setting scoped `secret`. | Yes — `lambda init --context-injection on\|off`, read by `inject.ts` |

Not agent-discoverable as a skill or command — same category as `gate`: a hook body invoked by a host's own runner, not something a model calls by name. This is structural, not a gap (see `docs/CLI_REFERENCE.md`'s "CLI vs. MCP tool fit" table).

### 4.3 `src/vocab/` — operator vocabulary and grammar (4 files, ~353 lines)

| File | Role | Wired? | Verdict |
|---|---|---|---|
| `operators.ts` | `ALL_OPERATORS`, `lookupOperator` — adapter over `formalism.ts` | Yes — `lambda operators` | clean |
| `attractors.ts` | `AttractorVocabulary` — gloss/escape-advice text | Yes — `analyze.ts`, `status.ts`, `session-briefing.ts` | clean |
| `execution-classes.ts` | Operator-class → execution mode / λ-band → budget tables | Mostly yes; `executionModeForClass` no (see §3.5) | one dead function |
| `grammar.ts` | `checkForbiddenSequence`, `sequenceViolations` | Yes, widely | clean; minor constraint-ID mislabeling on empty-sequence rejection, not a functional bug |

### 4.4 `src/ir/` — intermediate representation (4 files, ~739 lines)

| File | Role | Wired? | Verdict |
|---|---|---|---|
| `chainReading.ts` | Reports algebra statements about a sequence, cross-checked against measured commutator magnitude | Yes — `mcp/tools.ts`, `analyze.ts` | clean, but see §3.4 (dangling comment) |
| `compile.ts` | `compileIR`/`renderIRMarkdown` — the turn's legal-instruction surface | Yes — `lambda ir`, taught in `src/init/skills/ir.ts` | clean |
| `normalize.ts` | Collapses repeated operators into runs, flags low-coverage sequences | Yes, internally (`execution.ts` only) | clean |
| `execution.ts` | `compileExecutionProgram` — sequence → capability/budget-gated program | Yes to CLI; no skill file (see §3.9) | reachable but outside the agent-facing surface |

### 4.5 `src/cli-commands/` + `src/cli-support/` + `src/config/` + `src/assets/` (~1800 lines)

All 18 files in `cli-commands/` (one more than the prior audit's 17 — `inject.ts`) are dispatched from `src/cli.ts`'s `main()`; no dead file, no undispatched branch. `cli-support/` grew from 3 files to 5 (`session-store.ts`, `status-payload.ts`, `parse.ts`, plus the new `suggest-operator.ts` and `session-briefing.ts`), genuinely shared and non-duplicated. `config/settings.ts` shrank to one setting (see §4.2) and lost its secret-vs-init-scope distinction along with it — there is nothing left to keep out of the environment.

| Command | CLI-wired | Agent-discoverable (skill/command) | Notes |
|---|---|---|---|
| `analyze` | `cli.ts:324` | Yes | Praxis Workflow "analyze" step |
| `bind` | `cli.ts:373` | Indirectly (`session` skill) | thin test coverage (unchanged) |
| `compile` | `cli.ts:334` | **No** | see §3.9 |
| `diagnose` | `cli.ts:347` | Yes | canonical, best-tested pattern; source `task.ts` cloned |
| `gate` | `cli.ts:387` | Yes, as a hook | real, kernel-backed `PreToolUse` enforcement |
| `inject` | `cli.ts:394` | Yes, as a hook | new; see §4.2 |
| `halira` | `cli.ts:367` | Indirectly (`session` skill) | thin test coverage |
| `init` | `cli.ts:406` | n/a (is the installer) | heavily tested |
| `ir` | `cli.ts:379` | Yes | thin functional test coverage |
| `mcp` | `cli.ts:401` | Installed as MCP infra, not a skill | clean |
| `sense` | `cli.ts:312` | Indirectly (`session` skill) | thin test coverage |
| `solve` | `cli.ts:341` | Yes | Praxis Workflow support (intent.ts fallback) |
| `status` | `cli.ts:306` | Yes | clean |
| `step` | `cli.ts:318` | Indirectly (`session` skill) | thin test coverage |
| `sync` (alias `update`) | `cli.ts:422` | n/a (utility) | clean |
| `task` | `cli.ts:357` | Yes | duplicate of `diagnose` (§3.2) |
| `uninstall` | `cli.ts:428` | n/a (utility) | clean, reverses the managed-marker merge correctly |
| `doctor` | `cli.ts:412` | n/a (utility) | clean; absorbed a former separate `lambda detect` command |

`operators` and `check` remain inline (non-`cli-commands/`) branches in `src/cli.ts` (lines ~298, 302) — an older implementation pattern, not a defect, just inconsistent file organization relative to the newer per-file commands. `plan`/`run`/`inspect`/`replay`/`eval`/`promote`, previously listed here as the same inline pattern, are deleted along with `src/engine/*` (see §1) — there is no longer an inconsistency to note for those six.

Asset files in `src/assets/`: `problem_templates.json` (8 diagnosis templates, THE_IDEA.md-named), `task_templates.json` (5 recurring-work templates, not THE_IDEA.md-named), `formalism.json` (kernel's single source of truth), `commutator_skeleton.json` (vendored v2.1.0 measurement), `NOTICE.md` (provenance policy). All five are imported and used; none orphaned.

### 4.6 `src/init/` — installed AI-agent prose (44 files, ~2333 lines)

All 9 `SKILLS` (`status`, `analyze`, `solve`, `diagnose`, `task`, `intent`, `derive`, `session`, `ir`) are installed, mirrored 1:1 into `COMMANDS` via `Command.mirroring()` (all nine, not seven — see §3.10), and each verified accurate against its underlying CLI command's real flags/output shape. `AGENTS` is empty. `RULES` holds one entry (`no-invented-measurement`). **`HOOKS` now holds two entries** (`legality-gate`, `context-injection` — up from one at the prior audit), both real, both accurate to what they do (see §4.2). One MCP server (`recursive-praxis`).

One shipped-prose bug found and fixed in the course of this audit: `src/init/shared/epistemic-footer.ts`, appended to every kernel skill/command, warned agents that "`lambda run` invokes a model host and has a broader capability surface... intentionally out of scope for this skill" — a leftover reference to a command deleted along with `src/engine/*`. Removed; `npm test` re-verified green afterward. This is the one uncommitted change in the current working tree.

The install pipeline itself (`InitWizard.ts`, `registry.ts`, `write.ts`, `json-fragment.ts`, `config-flags.ts`, `WizardIO.ts`, the four `InitStep` subclasses) is unchanged and clean, non-destructive by construction, and matches its own documented 4-step model exactly. `config-flags.ts` now parses `--context-injection` instead of `--host`/`--model`/`--ollama-url`.

### 4.7 `src/hosts/` + `src/adapters/` + `src/detect/` + `src/render/` + `src/manifest/` (~2073 lines)

All clean at the module level. `src/adapters/` no longer has anything to overlap with `src/hosts/`'s naming (see §3.11 — resolved, not just renamed). `src/hosts/` is genuinely data-driven: each of the four adapters (`ClaudeCodeAdapter`, `CodexAdapter`, `CursorAdapter`, `OpencodeAdapter`) has a real, distinct reason for its shape, and now also a real, distinct answer for whether it receives the `context-injection` hook (Claude Code and Codex: yes, via the same default event-forwarding path the gate already used; Cursor and opencode: no, documented inline in each adapter). `src/detect/`, `src/render/`, `src/manifest/` are all clean, well-tested, no debt found. `CompositeLayout` (§3.6) remains the one inert class in this group.

---

## 5. Historical record: completed pivots visible in the working tree

Captured here because a "historical record" needs the transition, not just where things landed. Entries from the prior (2026-09-10) audit are kept; new entries are appended.

- **λ formula fix** (`fe0bedd`) — `solver.ts` used to hardcode `SOLVER_BETA`/`GAMMA`/thresholds as duplicates of what `formalism.ts` already defined. Now single-sourced from `formalism.json`.
- **Solver ranking-key bug fix** (`solver.ts:107-122`, see `docs/ALGEBRA_DYNAMICS_SEAM.md` §3) — terminal distance was being double-counted in the ranking key; fixed and pinned by tests.
- **Adjective table provenance pinning** (`b816349`) — the meta-prompt composition's word choices used to derive from a comment nothing checked; now a test asserts each adjective still equals `operatorMeaning(op)`.
- **Commutator skeleton vendoring** (`fc04ca0`) — the `|η_ij|` measurement data now vendored and read by `kernel/commutator.ts`.
- **Meta-prompt / prompt-policy removal** (`d4a0cb1` added it; removed in the working tree the prior audit captured, now committed) — a feature composing an operator sequence plus an intent into one rendered prompt. `lambda task` and `lambda gate` are confirmed *not* replacements for it — three unrelated problems. One leftover reference remains — see §3.4.
- **`lambda gate` / legality-gate hook** (now committed) — the first hook in this repo, `PreToolUse` enforcement of `legalNext`, real and tested.
- **`lambda task` / task templates** (now committed) — sibling to `lambda diagnose`, structurally duplicated from it (§3.2, unresolved).
- **The Lambda Engine rebuild** (`f2b4f10`, `0eef7af`, `10fc1d4`) — the pivot §1 describes in full: `src/engine/*` (planner + nested-model executor + trace/replay/eval), the four model-host transports in `src/adapters/`, and the `plan`/`run`/`inspect`/`replay`/`eval`/`promote` commands deleted; `lambda inject` + the `context-injection` hook added as a faithful mechanization of the *original* Cursor-rules Lambda Engine's actual mechanism (per-turn context injection), verified against the preserved corpus at `docs/inspirations/lambda-engine/`. `src/config/settings.ts` reduced from eight host/model/secret settings to one (`contextInjection`). All affected tests updated; `tests/engine.test.ts` and `tests/ollama.test.ts` deleted since their subject no longer exists.
- **Stale `lambda run` reference removed from shipped prose** (uncommitted at time of writing — see §4.6) — `epistemic-footer.ts` no longer warns agents about a command that was deleted in the pivot above.

---

## 6. What this document deliberately does not claim

Per the grounding rule, this inventory does not extend judgment to:
- Whether THE_IDEA.md's *intent* itself (forcing an AI agent to reason through the 20 operators) is a good design — that's the developer's call, and out of scope for a code/intent cross-check.
- `docs/inspirations/`, `docs/explorations/`, the Python REE/AI-Recursive-Framework quarry — THE_IDEA.md and `CONTRIBUTING.md` both frame these as historical/inspirational, not current behavior, and no code claim needed verifying against them. (The one exception is `docs/inspirations/lambda-engine/dot-cursor/`, which §1 *does* read — not as a behavior claim about this repo, but as the primary source for what the original Lambda Engine's mechanism actually was, which is what grounded the rebuild.)
- Anything not reachable from `src/` — this document audits shipped code, not the Python source or `.cursor` rules THE_IDEA.md mentions as prior art.
