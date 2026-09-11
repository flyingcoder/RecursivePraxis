# Feature Inventory

A historical-record cross-check: what the code in this repository actually does, verified against on-disk source and real call/registration graphs, held up against [`THE_IDEA.md`](../THE_IDEA.md) — the developer's own account, in his own words, of what this project is for.

**Method.** Every claim below is grounded in source: a function is "wired" only if a real caller was found by grep/read, not inferred from a comment; an asset is "agent-discoverable" only if it appears in one of `SKILLS`/`COMMANDS`/`AGENTS`/`RULES`/`HOOKS`/`MCP_SERVERS` (`src/init/*/index.ts`); a CLI command is "reachable" only if it has a branch in `src/cli.ts`'s `main()`. Where THE_IDEA.md makes a claim, this document checks it against the cited file rather than repeating it. Docs (`docs/*`, code comments) are read as *stated intent*, never as ground truth for *current behavior* — per THE_IDEA.md's own instruction to read it "as intent, not as documentation," and per this project's `CLAUDE.md`/`AGENTS.md` convention of trusting code over docs.

**As of**: 2026-09-10, branch `feat/multi-step-setup`, against a working tree with uncommitted deletions (a "meta-prompt"/"prompt-policy" feature being removed) and additions (`lambda gate`, `lambda task`) — both states are recorded here, since a historical record needs the transition, not just the endpoint.

---

## 1. The headline finding: THE_IDEA.md's own citations point at the wrong files

THE_IDEA.md ([`THE_IDEA.md:44-48`](../THE_IDEA.md#L44)) describes two enforcement mechanisms it built to make an AI agent actually use the 20 controlled-rupture operators:

- **Praxis workflow** — voluntary, through intent processing (slash command or agent choice).
- **Lambda engine** — mandatory, through state transition, "enforced through always true AI rules," citing [`src/init/hooks/legality-gate.ts`](../src/init/hooks/legality-gate.ts) as that enforcement, and describing `src/engine/*` ([`THE_IDEA.md:23-27`](../THE_IDEA.md#L23)) as the reasoning-guide code.

Tracing the actual call graph:

```
legality-gate.ts (hook)  →  `lambda gate`  →  src/cli-commands/gate.ts
                                                    │
                                                    ▼
                                        legalNext()  —  src/kernel/session.ts:12
```

`legalNext` lives in **`src/kernel/session.ts`**, a module THE_IDEA.md never names. It is not part of `src/engine/*` — `src/engine/orchestrator.ts` *calls into* the kernel's `kernelStep` rather than owning this logic itself. Meanwhile the literal `src/engine/*` files THE_IDEA.md calls "Lambda Engine" (`core.ts`, `orchestrator.ts`, `evaluation.ts` — backing `lambda plan/run/inspect/replay/eval/promote`) have **zero installed AI-agent-facing prose**: no Skill, Command, Agent, or Rule references them, and one of the skills that *does* exist explicitly tells the agent to stay away —

> "`lambda run` invokes a model host and has a broader capability surface than the commands above. It is intentionally out of scope for this skill — do not treat it as a default workflow step." — [`src/init/shared/epistemic-footer.ts:17`](../src/init/shared/epistemic-footer.ts#L17)

**Reading this as a historical record, not a bug report**: this isn't damage — it's what the vocabulary looked like *before* the architecture caught up with it. THE_IDEA.md is dated language describing an intent; the code shows the enforcement mechanism was actually built in `src/kernel/`, and `src/engine/*` ended up as a separate, real, tested, but deliberately agent-excluded execution/trace/replay subsystem. The names "engine," "kernel," and "session" ended up describing three different things across the codebase and THE_IDEA.md's prose, which is worth fixing in the vocabulary document itself — not the code.

---

## 2. THE_IDEA.md concept → code, as it actually stands

| THE_IDEA.md concept | What THE_IDEA.md says implements it | What the code shows actually implements it |
|---|---|---|
| **Lambda Engine** (reasoning guide via 20 operators, forced on the agent) | `src/engine/*` | Nothing forces it. `src/engine/*` is real (planning/execution/trace/replay/eval) but has no agent-facing prose and is explicitly fenced off. The one thing that *is* "always true" state-transition enforcement is `src/kernel/session.ts` + the `legality-gate.ts` hook — a different module than the one THE_IDEA.md names. |
| **Praxis Workflow** (intent → diagnose → analyze → execute) | `src/init/skills/intent.ts`, `diagnose.ts`, `analyze.ts` | Confirmed accurate for steps 1–4 (through "verify"). **Step 5 in `intent.ts` is "render the sequence as instructions" — there is no distinct step-6 "execute" asset.** `intent.ts`'s own hedge ("closest current implementation") is honest: execution is an implicit continuation the model is trusted to do afterward, unenforced by any hook or gate. THE_IDEA.md's own list is also incomplete — `task.ts` and `derive.ts` are equally load-bearing (`derive` is `intent`'s own documented fallback) and aren't mentioned. |
| **RecursivePraxis / `lambda diagnose`** | `src/assets/problem_templates.json`, diagnoses "AI Agent problems" | Accurate, and it's the cleanest, best-tested pattern in the repo (`tests/cli-commands/diagnose.test.ts`). But it now has an undocumented sibling — `lambda task` / `task_templates.json` — that THE_IDEA.md doesn't mention at all (see §4). |
| **AI Recursive Framework / REE** | Python quarry, "inspiration only" | Not audited here — THE_IDEA.md itself frames this as out-of-repo prior art, and [`src/assets/NOTICE.md`](../src/assets/NOTICE.md) is the checked-in policy governing how it may be used. No code claim to verify. |

---

## 3. Debt, redundancy, and inert-code ledger

Ordered roughly by how much it affects an actual AI agent's behavior, most consequential first.

### 3.1 `src/engine/*` is fully unreachable from any AI-agent-facing surface

- **What**: `planTask`/`runTask`/`verifyReplay`/`runCapabilityBenchmark`/`promoteExperimentalPolicy` back `lambda plan/run/inspect/replay/eval/promote` — wired directly and only inline in `src/cli.ts:368-443`, never through a `cli-commands/*.ts` file the way every other command is.
- **Verdict**: intent-mismatch (see §1) — real, tested (`tests/engine.test.ts`, 598 lines), actively developed, but structurally invisible to any agent following the installed skill/command surface.
- **Evidence**: `src/cli.ts:12,17,29-32,368-443`; absence confirmed by grep across `src/init/skills/*.ts` and `src/init/commands/*.ts`; explicit exclusion at `src/init/shared/epistemic-footer.ts:17`.

### 3.2 `lambda task` is a structural clone of `lambda diagnose`, and isn't in THE_IDEA.md

- **What**: `src/cli-commands/task.ts` reimplements `diagnose.ts`'s exact pipeline (lookup → `classifyAttractor` ×2 → `suggestTransitionOperators` → `solve` → print) against a second JSON file (`task_templates.json`) with fields renamed (`diagnosis`→`rationale`). Confirmed line-for-line structural match.
- **Verdict**: duplicate-of-`diagnose.ts`. Not a defect in isolation — it's well tested (`tests/cli-commands/task.test.ts`) and has a proper installed skill (`src/init/skills/task.ts`) — but it's a second bespoke implementation of the same four-step pipeline where a shared helper (`runTemplateLookup(templates, key, json)`) would remove the duplication. Also: THE_IDEA.md's RecursivePraxis section names `lambda diagnose`/`problem_templates.json` as *the* AI-agent-problem-diagnosis surface and says nothing about a parallel "recurring engineering work" template system — this is scope the vocabulary document hasn't caught up to.
- **Evidence**: `src/cli-commands/task.ts:1-65` vs `src/cli-commands/diagnose.ts:1-74`.

### 3.3 One genuine duplicate function inside the kernel

- **What**: `src/kernel/constraints.ts:49` defines its own `legalNext(sequence)`, doing the identical `OPERATORS.filter(op => !violatesHardConstraint(...))` filter that `src/kernel/session.ts:12-15` reimplements inline for its Mode-1 case, under the same name but a different signature (`sequence` vs. `Session`).
- **Verdict**: duplicate. `constraints.ts`'s version is not exported from the `kernel/index.ts` barrel and has zero callers in `src/` — only its own test file (`tests/kernel/constraints.test.ts`) reaches it directly, bypassing the barrel entirely.
- **Evidence**: `src/kernel/constraints.ts:48-51`; `src/kernel/session.ts:9-15`.

### 3.4 A dangling reference from the in-progress feature removal

- **What**: `src/ir/chainReading.ts:24-26`'s module doc comment still says: *"The composed-prompt path deliberately does not consume this... see the same pseudocode file"* — referring to `src/ir/promptPolicy.ts` and `praxis/protaseis/operator-chain-as-prompt-policy.psuedo`, both of which are deleted in the current working tree (confirmed via `git status` and `find praxis/`, which now shows only `derive-state-from-intent.psuedo` remaining). `chainReading.ts` itself hasn't been touched since before the removal — it's a leftover, not something actively maintained through the deletion.
- **Verdict**: stale comment, harmless at runtime, but exactly the kind of thing a historical record should catch before it confuses the next reader.
- **Evidence**: `src/ir/chainReading.ts:24-26`; `git status` (`D src/ir/promptPolicy.ts`, `D praxis/protaseis/operator-chain-as-prompt-policy.psuedo`); `git log --oneline -- src/ir/promptPolicy.ts` → `d4a0cb1`.

### 3.5 One dead exported function

- **What**: `src/vocab/execution-classes.ts:66`'s `executionModeForClass` has zero callers anywhere in `src/` or `tests/`. Its own module immediately wraps it into `executionMode` (`execution-classes.ts:70-72`), which is the function actually used everywhere (`src/ir/execution.ts:26-30,83,97`).
- **Verdict**: inert, unreachable, no test coverage even indirectly.
- **Evidence**: `src/vocab/execution-classes.ts:66-72`.

### 3.6 An inert install-pipeline class, built ahead of need

- **What**: `src/hosts/layouts.ts`'s `CompositeLayout` (lines 447-477) composes multiple `HostLayout`s for a host whose files don't live under one directory. Its own docstring names three scenarios that would need it (`~/.claude/rules/`, a project's `.mcp.json`, `opencode.json`) — but `grep -rn "new CompositeLayout"` across `src/` and `tests/` returns nothing. All four current host adapters use other layout classes; the three scenarios that motivated it are now handled by a different mechanism (`Placement.mcpFragment`/`hooksFragment` splicing into files outside the layout root) instead.
- **Verdict**: dead code that documents an anticipated need the codebase ended up solving a different way. Candidate for removal, or worth a comment explaining it's superseded.
- **Evidence**: `src/hosts/layouts.ts:145-163` (the fragment-splicing approach that superseded it), `src/hosts/layouts.ts:447-477` (the unused class).

### 3.7 Reserved-verb stubs — intentional, not accidental debt

- **What**: `src/record/`, `src/validate/`, `src/score/`, `src/revise/` are each a one-function stub (`throw new Error("X is not implemented")`), imported into `src/cli.ts:50-53` but dispatched from no CLI branch — unreachable.
- **Verdict**: **not debt.** [`CONTRIBUTING.md`](../CONTRIBUTING.md) documents these as "intentionally unimplemented" reserved verbs requiring "separately defined authority, inputs/outputs, evidence provenance, and failure semantics" before implementation. Listed here for completeness of the inventory, distinguished explicitly from the unintentional dead code above.
- **Evidence**: `src/record/index.ts` (and siblings); `src/cli.ts:50-53`; `CONTRIBUTING.md` §Scope and posture.

### 3.8 Self-declared inert research instruments — intentional, not accidental debt

- **What**: `src/kernel/degeneracy.ts` (`degeneracyReport`), `src/kernel/selectionStudy.ts` (`compareTransitionFilter`), `src/kernel/phasePortrait.ts` (`analyzeBasinStructure`), `src/kernel/commutator.ts` (`commutatorPairCount`) are all exported, all tested, all called by nothing in `src/`.
- **Verdict**: **not debt** — each module's own doc comment says so explicitly ("This is an instrument, not a check: nothing consults it at runtime" — `degeneracy.ts:42-43`; "deliberately a comparison and not a change to `solve`" — `selectionStudy.ts:74-75`). Recent, single-commit additions (`caa18ee`, 2026-08-25) — measurement tooling for the developer, never intended to reach a CLI surface. Distinguished from §3.5's `executionModeForClass`, which has no such declaration and looks like ordinary leftover code.
- **Evidence**: `src/kernel/degeneracy.ts:42-58`; `src/kernel/selectionStudy.ts:69-89`.

### 3.9 `lambda compile` — wired, tested, but outside the agent-facing skill surface

- **What**: `src/ir/execution.ts`'s `compileExecutionProgram` backs `lambda compile` (`src/cli.ts:109,146,531-533`), turning an operator sequence into a capability/budget-gated execution program. It's referenced descriptively in another MCP tool's text but is not itself an MCP tool, and unlike `analyze`/`status`/`ir`/`solve`/`diagnose`/`task`/`session`, there is no `src/init/skills/compile.ts`.
- **Verdict**: same shape as §3.1 at smaller scale — reachable by a human or an MCP client that already knows the function name, invisible to an agent following the installed skill surface. Worth a deliberate decision (install a skill, or confirm it's meant to stay CLI/MCP-internal) rather than leaving it as an accidental gap.
- **Evidence**: `src/ir/execution.ts:111-132`; `src/cli.ts:109,146,531-533`; confirmed absent via `src/init/skills/index.ts`.

### 3.10 Documentation drift inside the asset system itself

- **What**: `src/init/assets/ProseAsset.ts:69-70` and `src/init/README.md:66` both still say *"The seven kernel commands are currently word-for-word their matching skills"* — but `SKILLS`/`COMMANDS` (`src/init/skills/index.ts`, `src/init/commands/index.ts`) now hold **nine** entries each. No test asserts the count, so nothing caught the drift as `task.ts`, `derive.ts`, `session.ts`, `ir.ts` were added after that comment was written.
- **Verdict**: stale, behavior-harmless, easy fix.
- **Evidence**: `src/init/assets/ProseAsset.ts:69-70`; `src/init/README.md:66`; `src/init/skills/index.ts:19-29`.

### 3.11 A naming collision that costs a reader time, not correctness

- **What**: `src/hosts/*Adapter.ts` (install-time: where `lambda init` writes files — `ClaudeCodeAdapter`, `CursorAdapter`, `CodexAdapter`, `OpencodeAdapter`) and `src/adapters/*-transport.ts` (runtime: model-calling transports used by `lambda run` — `createCursorHost`, `createClaudeIdeHost`, `createAnthropicHost`, `createOllamaHost`) share the word "host" pervasively (`HostAdapter` vs. `ModelHost`, `HostRegistry` vs. `resolveHost()`) despite being completely independent — confirmed zero imports between the two trees in either direction. `CursorAdapter` and `createCursorHost`, for instance, share only the English word "cursor": one writes `.cursor/skills/*.md`, the other calls the `@cursor/sdk` for a cloud agent turn.
- **Verdict**: not a design flaw — genuinely two distinct, correctly-separated concepts — but a real risk for the next reader (human or agent) who assumes the shared name implies a relationship. Worth a naming pass or a short cross-reference comment in both directories.
- **Evidence**: grep confirms no cross-imports between `src/hosts/` and `src/adapters/`; `src/hosts/CursorAdapter.ts:9`; `src/adapters/cursor-transport.ts:114`.

### 3.12 Real test-coverage gaps (correctness risk, not architecture debt)

Three of `resolveHost()`'s five runtime transport branches have no test at all — contrast with `--host ollama`, which has a full 155-line dedicated suite (`tests/ollama.test.ts`) covering routing, schema constraint, timeout, and malformed-content cases:

| Transport | CLI flag | Used at | Tested? |
|---|---|---|---|
| `src/adapters/cursor-transport.ts` | `--host cursor` | `src/cli.ts:23,362` | **No** |
| `src/adapters/claude-ide-transport.ts` | `--host claude-ide` | `src/cli.ts:25,363` | **No** |
| `src/adapters/anthropic-transport.ts` | `--host anthropic` | `src/cli.ts:23,361` | **No** |
| `src/adapters/ollama-transport.ts` | `--host ollama` (documented default) | `src/cli.ts:349` | Yes — `tests/ollama.test.ts` |
| `adapters/model-hosts.ts` (`DeterministicFakeModelHost`) | `--host fake` | — | Yes — `tests/engine.test.ts` |

All three untested transports are real, complete implementations against genuine declared dependencies (`@cursor/sdk`, `@anthropic-ai/claude-agent-sdk`, `@anthropic-ai/sdk`), not stubs — this is a coverage gap, not dead code.

Separately, several session-mutation commands have only a "the flag exists in `--help`" assertion (`tests/fail-closed.test.ts:42`) and no functional test: `bind.ts`, `halira.ts`, `sense.ts`, `step.ts`, `ir.ts`. This contrasts with `diagnose`, `gate`, and `task`, which each have a dedicated `tests/cli-commands/*.test.ts`.

**A methodology note for future audits**: codegraph's static test-coverage detector flagged `OpencodeAdapter`, `readPraxisData`, and several `detect/signals.ts` functions as untested. All of those flags were **false positives** — each is genuinely exercised, but only through a registry/factory indirection (`HostRegistry.default()`) or a `unified().use(...)` plugin pipeline, which import-graph analysis can't see. The three transports in the table above are the real gaps; verify any future "no coverage" flag by reading the tests, not by trusting the tool.

---

## 4. Full per-subsystem inventory

### 4.1 `src/kernel/` — the formal operator model and state machine (15 files, ~2284 lines)

The actual substrate of "the 20 controlled rupture operators" and the real state-transition enforcement, despite being unnamed anywhere in THE_IDEA.md.

| File | Role | Wired? | Verdict |
|---|---|---|---|
| `types.ts`, `index.ts` | Operator alphabet, `Session`/`DissipationState` types, public barrel | Yes, universal | clean |
| `session.ts` | `legalNext`, `step`, `bind`, HALIRA Mode-2 escalation — the real enforcement THE_IDEA.md attributes to `legality-gate.ts` | Yes — `cli-commands/gate.ts`, `step.ts`, `ir/compile.ts`, etc. | clean (see §1 for the citation mismatch) |
| `constraints.ts` | `violatesHardConstraint`, `violatesSequenceEndConstraint`, `trailingRunLength` | Yes | clean, except its own `legalNext` — see §3.3 |
| `halira.ts` | Mode-2 recovery step table | Yes — `session.ts`, `ir/compile.ts` | clean |
| `commutator.ts` | Reads vendored `|η_ij|` magnitudes | `commutatorMagnitude` yes; `commutatorPairCount` no (see §3.8) | mostly clean |
| `dissipation.ts` | λ-cost model over a sequence | Yes — `solver.ts`, `engine/core.ts`, `cli-commands/analyze.ts` | clean; documents a fixed historical formula bug |
| `derive.ts` | Deterministic intent→initial-state mapping, "no invented measurement" | Yes — `engine/core.ts`, `intentArc.ts` | clean, self-audited (documents a 4158-combination calibration sweep) |
| `phasePortrait.ts` | Attractor classification, Lyapunov dynamics, transition suggestions | Mostly yes; `analyzeBasinStructure` no (see §3.8) | mostly clean; two transition tables coexist by documented design (`NOTICE.md` item 7), not accidental duplication |
| `intentArc.ts` | `planArc`/`verifyArc`/`numbersForLabel` — deterministic half of intent→arc derivation | Yes — `mcp/tools.ts` | clean |
| `selectionStudy.ts`, `degeneracy.ts` | Self-declared research instruments | No (deliberately) — see §3.8 | not debt |
| `solver.ts` | Beam-search A* toward a target (D,C) | Yes, 18 callers | clean; documents a fixed historical ranking-key bug |
| `formalism.ts` | Typed reader for `formalism.json` — single source of truth for operator/algebra data | Yes, universal | clean; documents a fixed "half-wired constants" bug |
| `algebra.ts` | Parses `algebra_relations` into queryable statements; explicitly "not enforced, must not become enforcement" | Yes — `cli.ts`, `ir/chainReading.ts` | clean |

### 4.2 `src/engine/` — THE_IDEA.md's literal "Lambda Engine" (3 files, ~1277 lines)

See §1 and §3.1. Real, CLI-wired (`lambda plan/run/inspect/replay/eval/promote`), tested (`tests/engine.test.ts`), actively developed — and completely absent from every AI-agent-facing asset.

### 4.3 `src/vocab/` — operator vocabulary and grammar (4 files, ~353 lines)

| File | Role | Wired? | Verdict |
|---|---|---|---|
| `operators.ts` | `ALL_OPERATORS`, `lookupOperator` — adapter over `formalism.ts` | Yes — `lambda operators`, `engine/core.ts` | clean |
| `attractors.ts` | `AttractorVocabulary` — gloss/escape-advice text | Yes — `analyze.ts`, `status.ts` | clean |
| `execution-classes.ts` | Operator-class → execution mode / λ-band → budget tables | Mostly yes; `executionModeForClass` no (see §3.5) | one dead function |
| `grammar.ts` | `checkForbiddenSequence`, `sequenceViolations` | Yes, widely | clean; minor constraint-ID mislabeling on empty-sequence rejection, not a functional bug |

### 4.4 `src/ir/` — intermediate representation (4 files, ~739 lines)

| File | Role | Wired? | Verdict |
|---|---|---|---|
| `chainReading.ts` | Reports algebra statements about a sequence, cross-checked against measured commutator magnitude | Yes — `mcp/tools.ts`, `analyze.ts` | clean, but see §3.4 (dangling comment) |
| `compile.ts` | `compileIR`/`renderIRMarkdown` — the turn's legal-instruction surface | Yes — `lambda ir`, taught in `src/init/skills/ir.ts` | clean |
| `normalize.ts` | Collapses repeated operators into runs, flags low-coverage sequences | Yes, internally (`execution.ts` only) | clean |
| `execution.ts` | `compileExecutionProgram` — sequence → capability/budget-gated program | Yes to CLI/MCP text; no skill file (see §3.9) | reachable but outside the agent-facing surface |

### 4.5 `src/cli-commands/` + `src/cli-support/` + `src/config/` + `src/assets/` (~2000 lines)

All 17 files in `cli-commands/` are dispatched from `src/cli.ts`'s `main()` — no dead file, no undispatched branch. `cli-support/` (`session-store.ts`, `status-payload.ts`, `parse.ts`) is genuinely shared, non-duplicated infrastructure used by 6-8 commands each. `config/settings.ts` is a clean, immutable, zod-validated settings model with a strict env-vs-persisted-config separation for secrets. Full per-command detail:

| Command | CLI-wired | Agent-discoverable (skill/command) | Notes |
|---|---|---|---|
| `analyze` | `cli.ts:521` | Yes | Praxis Workflow "analyze" step |
| `bind` | `cli.ts:570` | Indirectly (`session` skill) | thin test coverage (§3.12) |
| `compile` | `cli.ts:531` | **No** | see §3.9 |
| `diagnose` | `cli.ts:544` | Yes | canonical, best-tested pattern; source `task.ts` cloned |
| `gate` | `cli.ts:584` | Yes, as a hook | new this session; real Lambda-Engine-adjacent enforcement (kernel-backed) |
| `halira` | `cli.ts:564` | Indirectly (`session` skill) | thin test coverage |
| `init` | `cli.ts:596` | n/a (is the installer) | heavily tested |
| `ir` | `cli.ts:576` | Yes | thin functional test coverage |
| `mcp` | `cli.ts:591` | Installed as MCP infra, not a skill | clean |
| `sense` | `cli.ts:509` | Indirectly (`session` skill) | thin test coverage |
| `solve` | `cli.ts:538` | Yes | Praxis Workflow support (intent.ts fallback) |
| `status` | `cli.ts:503` | Yes | clean |
| `step` | `cli.ts:515` | Indirectly (`session` skill) | thin test coverage |
| `sync` (alias `update`) | `cli.ts:612` | n/a (utility) | clean |
| `task` | `cli.ts:554` | Yes | duplicate of `diagnose` (§3.2); new this session |
| `uninstall` | `cli.ts:618` | n/a (utility) | clean, reverses the managed-marker merge correctly |
| `doctor` | `cli.ts:602` | n/a (utility) | clean; absorbed a former separate `lambda detect` command |

Inline (non-`cli-commands/`) branches also exist for `operators`, `check`, `plan`, `run`, `inspect`, `replay`, `eval`, `promote` (`src/cli.ts:219-443`) — an older, separate implementation pattern, not a defect, just inconsistent file organization relative to the newer per-file commands.

Asset files in `src/assets/`: `problem_templates.json` (8 diagnosis templates, THE_IDEA.md-named), `task_templates.json` (5 recurring-work templates, not THE_IDEA.md-named), `formalism.json` (kernel's single source of truth), `commutator_skeleton.json` (vendored v2.1.0 measurement), `NOTICE.md` (provenance policy). All five are imported and used; none orphaned.

### 4.6 `src/init/` — installed AI-agent prose (43 files, ~2356 lines)

All 9 `SKILLS` (`status`, `analyze`, `solve`, `diagnose`, `task`, `intent`, `derive`, `session`, `ir`) are installed, mirrored 1:1 into `COMMANDS` via `Command.mirroring()` (drift is structurally impossible by construction), and each verified accurate against its underlying CLI command's real flags/output shape — no stale instructions found beyond §3.10's count comment. `AGENTS` is empty (documents how to add one, has none). `RULES` holds one entry (`no-invented-measurement`, verified accurate — its cited Zod-strict-mode rejection behavior checks out against `src/mcp/tools.ts:45`). `HOOKS` holds one entry (`legality-gate`, real and accurate as a description of what it does, mismapped by THE_IDEA.md as to *which* module it enforces — see §1). One MCP server (`recursive-praxis`, exposing the `derive`/`algebra` tool sets, confirmed dispatching to `lambda mcp`).

The install pipeline itself (`InitWizard.ts`, `registry.ts`, `write.ts`, `json-fragment.ts`, `config-flags.ts`, `WizardIO.ts`, the four `InitStep` subclasses) is clean, non-destructive by construction (managed markers for prose, whole-file content comparison for JSON), and matches its own documented 4-step model exactly.

### 4.7 `src/hosts/` + `src/adapters/` + `src/detect/` + `src/render/` + `src/manifest/` (~2651 lines)

All clean at the module level; the one real design question (are `hosts/` and `adapters/` confusingly overlapping?) resolves to "no functional overlap, naming collision only" — see §3.11. `src/hosts/` is genuinely data-driven, not copy-paste boilerplate: each of the four adapters (`ClaudeCodeAdapter`, `CodexAdapter`, `CursorAdapter`, `OpencodeAdapter`) has a real, distinct reason for its shape (dual-layout for Claude Code's plugin distribution, Codex's self-detection avoidance, Cursor's divergent hook schema, opencode's commands-only surface) — this is the reference OOP shape `AGENTS.md` item 1 asks for. `src/detect/`, `src/render/`, `src/manifest/` are all clean, well-tested (180, ~330, 230 lines of dedicated tests respectively), no debt found. `CompositeLayout` (§3.6) is the one inert class in this group.

---

## 5. Historical record: completed pivots visible in the working tree

Captured here because a "historical record" needs the transition, not just where things landed:

- **λ formula fix** (`fe0bedd fix(kernel): correct the stated λ formula and wire the solver's objective`) — `solver.ts` used to hardcode `SOLVER_BETA`/`GAMMA`/thresholds as duplicates of what `formalism.ts` already defined; "the block was half-wired." Now single-sourced from `formalism.json`.
- **Solver ranking-key bug fix** (documented at `solver.ts:107-122`, see `docs/ALGEBRA_DYNAMICS_SEAM.md` §3) — terminal distance was being double-counted in the ranking key; fixed and pinned by tests.
- **Adjective table provenance pinning** (`b816349 feat(vocab): pin the adjective table's provenance and seam an override onto it`) — the meta-prompt composition's word choices used to derive from a comment nothing checked; now a test asserts each adjective still equals `operatorMeaning(op)`.
- **Commutator skeleton vendoring** (`fc04ca0 ... vendor the v2.1.0 commutator skeleton and record its inert magnitudes`) — the `|η_ij|` measurement data now vendored and read by `kernel/commutator.ts`.
- **Meta-prompt / prompt-policy removal (in progress, uncommitted)** — `d4a0cb1 feat(prompt-policy): compose an operator chain into one prompt (meta-prompt)` added a feature that composed an already-chosen operator sequence plus an intent into one rendered prompt (a "properties held simultaneously" reading of `∘`). The working tree currently deletes `src/cli-commands/meta-prompt.ts`, `src/init/commands/meta-prompt.ts`, `src/init/skills/meta-prompt.ts`, `src/ir/promptPolicy.ts`, `src/vocab/prompt-policy.ts`, `praxis/protaseis/operator-chain-as-prompt-policy.psuedo`, `docs/suggestions/three-party-prompt-generation.md`, and their tests. **Confirmed**: `lambda task` and `lambda gate` (new, untracked) are *not* replacements for this — they solve three unrelated problems (template classification, PreToolUse legality gating, and prompt composition, respectively). One leftover reference to this removal remains — see §3.4.
- **`lambda gate` / legality-gate hook (in progress, uncommitted)** — new PreToolUse enforcement, the first hook in this repo, real and tested (`tests/cli-commands/gate.test.ts`, `tests/hooks-install.test.ts`).
- **`lambda task` / task templates (in progress, uncommitted)** — new sibling to `lambda diagnose`, structurally duplicated from it (§3.2).

---

## 6. What this document deliberately does not claim

Per the grounding rule, this inventory does not extend judgment to:
- Whether THE_IDEA.md's *intent* itself (forcing an AI agent to reason through the 20 operators) is a good design — that's the developer's call, and out of scope for a code/intent cross-check.
- `docs/inspirations/`, `docs/explorations/`, the Python REE/AI-Recursive-Framework quarry — THE_IDEA.md and `CONTRIBUTING.md` both frame these as historical/inspirational, not current behavior, and no code claim needed verifying against them.
- Anything not reachable from `src/` — this document audits shipped code, not the Python source or `.cursor` rules THE_IDEA.md mentions as prior art.
