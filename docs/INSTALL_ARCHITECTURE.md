# Installation architecture — distribution, `lambda init`, and host detection

Status: **implemented**. This is the design record for how `lambda` reaches a
machine and how it configures host agents — the reasoning behind the shape, the
evidence the host paths rest on, and the invariants that must not be broken.

For *how to use* any of it, see [README § Install](../README.md#install) and
[CLI reference § Agent integrations](CLI_REFERENCE.md#agent-integrations). This
document does not repeat the flag surface; it explains why that surface exists.

Promoted from `docs/suggestions/` after the design shipped in `f68b4ac`
(wizard + manifest), `b3c7075` (installers + release pipeline), and `493ba3a`
(documentation).

---

## 1. The separation the whole design rests on

| | What it does | What it does **not** do |
| --- | --- | --- |
| **Step 1 — install** (`npm`, [install.sh](../install.sh), [install.ps1](../install.ps1)) | Puts the `lambda` executable on the machine | Touch any host agent. No `.claude/`, no `.cursor/`, no `.agents/`, no `.opencode/` |
| **Step 2 — `lambda init`** | Detects host agents, asks which to include, asks project or global, generates the package for each | Install the CLI, choose a model, or write runtime settings |

Installing the CLI is deliberately inert. Nothing reaches a host agent until a
human runs `lambda init` and answers four questions. Every command below
preserves that split: `lambda uninstall` removes generated files and says so;
`install.sh --uninstall` removes the binary and says so. Two installs, two
removals.

---

## 2. Distribution

### 2a. npm — the primary channel

```sh
npm install -g recursive-praxis     # then: lambda init
npx recursive-praxis init           # no global install
```

`prepare` runs `npm run build`, so a git-URL install produces a real
`dist/cli.js` despite `dist/` being gitignored; `files: ["dist", …]` means the
published tarball already contains the build and `prepare` is skipped
([package.json](../package.json)).

**No dependency is native.** `better-sqlite3`, `commander`,
`zod-to-json-schema`, and both `@opentelemetry/*` packages were declared but
imported by no source file; they were dropped. This was a precondition, not
housekeeping: a native module cannot be bundled into a single-file release
artifact, and every installer would otherwise pay a `node-gyp` compile for code
nothing calls.

### 2b. `install.sh` — macOS and Linux

Seven phases, modeled on [codegraph's installer](https://github.com/colbymchenry/codegraph/blob/main/install.sh):

```
1. Detect platform      uname -s → darwin|linux ; uname -m → arm64|x64
2. Resolve version      LAMBDA_VERSION, else the GitHub releases/latest
                        redirect (avoids the API's rate limit), else the API
3. Download + verify    tarball and SHA256SUMS; fail closed on mismatch
4. Place                $INSTALL_DIR/versions/$version
5. Link                 $BIN_DIR/lambda ; $INSTALL_DIR/current
6. Prune                remove version dirs other than the new one
7. Verify PATH          warn if $BIN_DIR is absent, or if another lambda shadows
```

| Variable | Purpose | Default |
| --- | --- | --- |
| `LAMBDA_VERSION` | release tag to install | latest |
| `LAMBDA_INSTALL_DIR` | versioned bundles | `~/.recursive-praxis-cli` |
| `LAMBDA_BIN_DIR` | symlink location | `~/.local/bin` |

> `~/.recursive-praxis-cli`, not `~/.recursive-praxis`: the latter is already the
> per-project session directory ([settings.ts](../src/config/settings.ts)).
> Reusing it would collide the moment someone runs `lambda` from `$HOME`.

### 2c. `install.ps1` — Windows

Same seven phases, Windows-native placement:

| Concern | Choice |
| --- | --- |
| Install dir | `$env:LOCALAPPDATA\RecursivePraxis` (`LAMBDA_INSTALL_DIR` overrides) |
| Shim | `lambda.cmd` — not a symlink, which needs Developer Mode or elevation |
| PATH | appended to the **user** PATH via `[Environment]::SetEnvironmentVariable(…, 'User')`; never machine-wide, never elevated |
| Verify | `Get-FileHash -Algorithm SHA256` against the published `SHA256SUMS` |
| Uninstall | `install.ps1 -Uninstall` — remove the tree, strip the PATH entry |

### 2d. Security posture for a downloadable installer

A piped remote script executes unread code with the user's privileges, which
sits badly with a runtime whose premise is bounded, auditable execution
([SECURITY.md](../SECURITY.md)). Shipping one is a deliberate decision, and
these five properties are what make the accepted risk small. They are
load-bearing — removing any one makes the installer worse than not shipping one:

1. **`SHA256SUMS` is fetched and verified, and a mismatch aborts.** codegraph's
   installer verifies nothing and leans entirely on HTTPS; this is the one place
   the reference implementation is wrong to copy. An artifact absent from
   `SHA256SUMS` is refused rather than trusted.
2. **The read-then-run form is documented first**, with the pipe as the shorter
   alternative rather than the headline.
3. **Versions can be pinned** — `LAMBDA_VERSION=v0.2.0 sh install.sh`.
4. **No `sudo`, ever.** Everything lands under `$HOME`; an installer wanting
   `/usr/local/bin` prints the `LAMBDA_BIN_DIR` override instead of escalating.
5. **One script, one host.** Nothing fetches a second script from inside the first.

### 2e. The release artifact: Tier B now, Tier A later

| | Tier A — self-contained | **Tier B — current** |
| --- | --- | --- |
| Artifact | `esbuild --bundle` + Node SEA or `bun build --compile` | `dist/` + production deps + a launcher running the system Node |
| User needs Node? | No | Yes, ≥ 20 |
| Blocked by | Nothing any more — no dependency is native | — |

[scripts/build-release-artifact.mjs](../scripts/build-release-artifact.mjs)
builds Tier B with Tier A's exact paths, environment variables, and uninstall
semantics already in place, so the upgrade is a change of artifact, not a change
of UX. It stages each target separately with npm's `--os`/`--cpu`, because the
Anthropic and Cursor SDKs pull per-platform optional packages — staging once and
copying would put macOS binaries inside the Linux tarball, an artifact that
installs cleanly and then fails at the first `lambda run`.

---

## 3. `lambda init` — four steps, and no fifth

```
Step 1  Detect       find host agents on this machine and in this project
Step 2  Which hosts  human confirms or edits the selection
Step 3  Which scope  global (this machine) or per-project (this repo)
Step 4  Generate     write the package for each selected host
```

Three rules give the flow its shape:

- **Detection sets the default checkbox state only.** Every host stays
  selectable, including undetected ones — installing ahead of a host is
  legitimate, and refusing it would make detection authoritative over its own
  user.
- **Scope is never inferred.** Writing under `~` is a different act of consent
  from writing in the repository the human is standing in, so it is always an
  explicit Step 3 answer or an explicit `--scope global`.
- **Step 4 has no confirmation prompt**, because writing cannot clobber: the
  managed-marker merge preserves anything appended after `MARKER_END` and
  reports `skipped` for a file it does not own
  ([managed-block.ts](../src/render/managed-block.ts), [write.ts](../src/init/write.ts)).
  A preview step would be ceremony over a non-destructive operation.

### What is deliberately not a step

| Not a step | Why | Where it lives instead |
| --- | --- | --- |
| Model host / Ollama / model name | Not needed to configure a host agent; the runtime already defaults to local Ollama | `--host` / `--model` / `--ollama-url` remain flags on `init` and prompt for nothing |
| Settings review | Same | `lambda status`, `lambda doctor` |
| Preview / dry-run confirmation | Writes are non-destructive by construction | — |
| Preflight (node version, git repo) | Assertions, not questions — fail at the point of failure | — |
| Smoke test | Verification is a separate concern with its own command | `lambda doctor` |

### The non-interactive contract

The original `init` refused to run without `--tools`, on the stated grounds that
"this CLI has no interactive tool selection." That guarantee is not removed — it
is made conditional on there being nobody to ask
([init.ts:209](../src/cli-commands/init.ts#L209)):

- **TTY present** → the wizard runs; flags pre-answer their step and skip it.
- **No TTY, flags complete** → runs silently, exits 0.
- **No TTY, flags missing** → exits non-zero naming the missing flag, via
  `NeedsFlagError` ([WizardIO.ts:263](../src/init/WizardIO.ts#L263)) — the same
  fail-closed posture as `Settings.require`.

`--json` also forces non-interactive, so machine-readable output can never be
interleaved with prompts.

---

## 4. Host surfaces per scope

Verified against each vendor's documentation in 2026-08. Each adapter carries a
`verifiedAgainst` string recording which release its paths were checked against,
because these paths drift.

| Host | Project scope | Global scope | Invocation |
| --- | --- | --- | --- |
| **Claude Code** | `.claude/skills/recursive-praxis-<id>/SKILL.md` + `.claude/commands/praxis/<id>.md` | `~/.claude/skills/recursive-praxis/` as a **skills-directory plugin**: `.claude-plugin/plugin.json` + `skills/<id>/SKILL.md` | `/praxis:<id>` · `/recursive-praxis:<id>` (global) |
| **Cursor** | `.cursor/skills/recursive-praxis-<id>/SKILL.md` + `.cursor/commands/praxis-<id>.md` | `~/.cursor/…` (same shape) | `/praxis-<id>` |
| **Codex CLI** | `.agents/skills/recursive-praxis-<id>/SKILL.md` | **`~/.agents/skills/…`** — *not* `~/.codex/skills/` | `$recursive-praxis-<id>` |
| **opencode** | `.opencode/commands/praxis-<id>.md` | `~/.config/opencode/commands/praxis-<id>.md` | `/praxis-<id>` |

Three findings behind that table, each of which would have been a defect if
guessed:

1. **Claude Code at global scope is a real plugin, not loose files.**
   `claude plugin init <name>` scaffolds `~/.claude/skills/<name>/` containing
   `.claude-plugin/plugin.json`; it auto-loads with no marketplace and no install
   step, and namespaces every skill as `/<plugin-name>:<skill>`. That is strictly
   better than scattering seven sibling directories through `~/.claude/skills/`,
   and its `version` field gives `doctor` and `sync` something to compare
   against ([ClaudeCodeAdapter.ts:27](../src/hosts/ClaudeCodeAdapter.ts#L27)).
2. **Codex user-level skills live at `~/.agents/skills`.** Codex scans
   `.agents/skills` upward from cwd, then `$HOME/.agents/skills`, then
   `/etc/codex/skills`. An earlier draft listed `~/.codex/skills/` — a directory
   Codex never reads.
3. **opencode has commands, not skills** — markdown with `description`
   frontmatter, filename as command name. So it gets the command surface only,
   exactly as Codex gets the skill surface only. The directory name has drifted
   between `commands/` and `command/` across releases; it is resolved in one
   place ([OpencodeAdapter.ts](../src/hosts/OpencodeAdapter.ts)).

Two detection traps, both guarded in code:

- **`AGENTS.md` is not a Codex signal.** It is a cross-vendor convention several
  hosts read. Treating it as proof of Codex would write Codex files on machines
  that have never run Codex, so it is not a probe.
- **`.agents/skills/` is what our own `init` writes.** Counting it as detection
  would make the tool detect itself, so a directory holding only
  `recursive-praxis-*` entries classifies as `already-initialized`, never as
  `host-present` ([CodexAdapter.ts:15](../src/hosts/CodexAdapter.ts#L15)).

---

## 5. Detection, without a `detect` command

Detection is a method on the host object, not a command and not a switch
statement in the wizard. A standalone `lambda detect` was considered and
rejected: its scriptable, bug-report-friendly output is exactly what
`lambda doctor --json` already provides, and a second command would have meant
two places where the confidence ladder could disagree.

| Kind | Meaning | Trust |
| --- | --- | --- |
| `binary` | executable resolvable on `PATH` | high — filesystem fact |
| `config` | user- or project-level directory exists | high — filesystem fact |
| `env` | env var set by a host running us right now | **heuristic** — undocumented, may change between host releases |

| Host | `binary` | `config` (user) | `config` (project) | `env` (heuristic) |
| --- | --- | --- | --- | --- |
| Claude Code | `claude` | `~/.claude/`, `~/.claude.json` | `.claude/` | `CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT` |
| Cursor | `cursor`, `cursor-agent` | `~/.cursor/`, `~/Library/Application Support/Cursor/`, `~/.config/Cursor/` | `.cursor/` | `CURSOR_TRACE_ID`, `CURSOR_AGENT` |
| Codex CLI | `codex` | `~/.codex/`, `~/.agents/skills/` | `.agents/skills/` ¹ | `CODEX_SANDBOX`, `CODEX_HOME` |
| opencode | `opencode` | `~/.config/opencode/` | `.opencode/`, `opencode.json(c)` | — |

¹ classified `already-initialized` when it holds only our own managed files.

```
running-here   env marker present            → this host is executing us now
active-here    project-local config dir      → this repo is already used with this host
installed      binary on PATH                → host is on the machine
configured     user-level config dir         → host has been run at least once
absent         no signal
```

Default-checked in Step 2: `running-here`, `active-here`, and
`installed ∧ configured`. Offered unchecked: `installed` xor `configured` alone,
and `absent`. Evidence is always printed rather than a bare verdict, and env
markers are labelled `(heuristic)`, so the human can disagree with the machine
in Step 2 — detection only chooses where the cursor starts.

`HostContext` injects env, home, platform, `exists`, and `onPath`
([context.ts](../src/detect/context.ts)), so detection is testable with a fake
home and a fake PATH and no filesystem at all. `onPath` honours `PATHEXT` on
Windows.

---

## 6. The object model

The predecessor was an object literal of four closures per host with no state
(`src/init/targets.ts`). It had nowhere to put detection probes, per-scope paths,
or a per-host render pipeline; adding any of the three meant a parallel
`Record<ToolId, …>` beside it, and adding all three would have destroyed the
"one host = one place" property. `buildPlan` would have grown a `scope` parameter
and a set of `if (toolId === …)` branches.

A host is now a class. `HostAdapter`
([HostAdapter.ts:53](../src/hosts/HostAdapter.ts#L53)) declares five abstract
members — `id`, `label`, `verifiedAgainst`, `probes`, `layout`, `pipeline`,
`invocation` — and two template methods, `detect` and `plan`, that no adapter
overrides. `probes` is `protected`: a host contributes evidence, and the
confidence ladder is ranked in exactly one place. That is the property the old
design could not have — with a record of literals, every host could rank itself
differently.

```
src/hosts/        HostAdapter, HostRegistry, four adapters, layouts, tools-flag, types
src/detect/       HostSignal, the confidence ladder, HostContext
src/init/         InitWizard, steps/, WizardIO implementations, workflows, write
src/render/       DocumentPipeline, managed-block, remark plugins
src/manifest/     InstallManifest, inspect
src/cli-commands/ init, doctor, sync, uninstall — thin
```

**Layouts are a hierarchy, not flags.** `StandaloneLayout`, `PluginLayout`, and
`CommandsOnlyLayout` ([layouts.ts](../src/hosts/layouts.ts)) exist because "a
plugin directory with a manifest", "loose files under a dot-directory", and
"markdown commands with no manifest at all" are genuinely different structures;
collapsing them into one class with three optional fields would push the
difference back into the caller.

**The wizard is four objects, so the four steps are four lines.**
`InitWizard.run` ([InitWizard.ts](../src/init/InitWizard.ts)) composes
`DetectHostsStep → ChooseHostsStep → ChooseScopeStep → GenerateStep`. Proving
that no fifth step exists is a code review of one method.

**`WizardIO` is the port that keeps interactive and scripted `init` one code
path.** `TtyWizardIO`, `FlagWizardIO`/`PreAnsweredWizardIO`, and
`ScriptedWizardIO` ([WizardIO.ts](../src/init/WizardIO.ts)) are three drivers of
one wizard, so `--tools`/`--scope` are not a parallel implementation that can
drift. `ScriptedWizardIO` asserts every question was consumed, which is what
makes the four steps unit-testable with no TTY, no filesystem, and no
subprocess.

Adding a fifth host is one new file plus one line in `HostRegistry`. The wizard,
`doctor`, `sync`, and `uninstall` need no edits — which is the whole argument for
putting detection, layout, and rendering *on the host object* rather than in the
callers.

---

## 7. Text generation with `unified`

Workflow bodies were previously written verbatim to every host, with per-host
variation confined to a frontmatter line built by `JSON.stringify`. That had one
specific cost: **a workflow body could not tell the reader how to invoke it**,
because the invocation is the one thing that differs per host and scope. Every
workflow worked around this by never mentioning it.

`DocumentPipeline` ([DocumentPipeline.ts](../src/render/DocumentPipeline.ts))
makes that a transform instead of a taboo:

```
remark-parse → remark-gfm → remark-frontmatter
  → remark-praxis-frontmatter   host-specific frontmatter keys
  → remark-praxis-invocation    an invocation placeholder → this host's syntax
  → remark-praxis-managed-block marker nodes + the do-not-edit notice
  → remark-stringify
```

Each plugin is a small unit-testable function over mdast, and per-host
differences are plugin *options* rather than string branches. Because the
managed region is a node range rather than a byte offset, `parseManaged`
([DocumentPipeline.ts:105](../src/render/DocumentPipeline.ts#L105)) can hand
`doctor` the region's AST while `mergeManaged`'s public guarantees are
unchanged: content after `MARKER_END` survives verbatim, and a file without
markers is never touched.

Every dependency — `unified`, `remark-parse`, `remark-stringify`,
`remark-frontmatter`, `remark-gfm`, `unist-util-visit`, `yaml`, `vfile` — is
pure-JS ESM with no native build, which is what keeps §2e's Tier A upgrade open.

**Two traps, both guarded by tests rather than by care:**

1. **Stringifier drift.** `remark-stringify` normalizes markdown, so the
   generated bytes changed once when this landed. The guard is a fixed-point
   property test — `render(w) === restringify(render(w))` across every workflow ×
   host × scope ([render.test.ts](../tests/render.test.ts)). Without it, an
   idempotent `init` could silently become a churning one.
2. **Escaping `$`.** Codex's invocation is `$recursive-praxis-<id>` and skill
   bodies use `$ARGUMENTS`; `remark-stringify` escapes text-node punctuation. A
   test asserts the `$`-prefixed invocation is emitted intact rather than
   backslash-escaped.

---

## 8. The install manifest

`doctor`, `sync`, and `uninstall` all need to know what was written, by which
version, at which scope. Without a record, each would have to re-derive paths
from the current host table — which drifts between releases, so every rename
would leave orphans no command could see, and `uninstall` would be guessing.

`install.json` ([InstallManifest.ts](../src/manifest/InstallManifest.ts)) lives
at `.recursive-praxis/install.json` (project) or
`~/.recursive-praxis-cli/install.json` (global) and records `manifestVersion`,
`lambdaVersion`, `scope`, and per host its root plus every file with a hash.

Two properties make it trustworthy:

- **The hash covers the managed region only**, so content a user appended after
  `MARKER_END` never reads as drift.
- **A `manifestVersion` this build does not understand is an error naming
  `lambda init`**, not a silent partial read.

With it: `uninstall` removes a known list instead of guessing, `sync` re-runs
generation with the recorded answers and no prompts, and `doctor` can name
*orphans* — files a previous version wrote that this version no longer plans.

Project-scope manifests contain only project-relative paths and are meant to be
committed; that is what lets `doctor` and `sync --check` run in CI. See
[CLI reference](CLI_REFERENCE.md#agent-integrations) for the `.gitignore`
negation that makes it possible.

---

## 9. The three manifest-backed commands

**`lambda doctor`** catches four things nothing else does: a managed region
edited by hand, orphans from a previous version, a manifest older than the CLI,
and files still installed after the host itself disappeared. It exits non-zero on
any of them, so it works as a CI check, and it is where detection evidence
surfaces now that there is no `lambda detect`.

**`lambda uninstall`** applies `mergeManaged`'s invariant in reverse: a file is
deleted only if it is in the manifest, still carries both markers, and has no
content after `MARKER_END`. Anything appended means the file is the user's now,
and a kept file is reported as a result rather than a failure. `--prune` removes
only orphans. It ends by saying the binary is still installed and naming
`install.sh --uninstall`.

**`lambda sync`** re-runs generation from the manifest, asking nothing;
`--check` exits non-zero if anything would change.

`lambda update` is an alias for `sync` and **never self-updates**
([cli.ts:543](../src/cli.ts#L543)). The word reads to most people as "update the
CLI itself", so the help text says in one line which one it is and how to do the
other. A self-updating CLI rewrites its own binary — a materially larger security
surface for a runtime whose premise is bounded execution.

---

## 10. Verification

122 tests across seven files cover this surface, within a suite of 378:

| File | Tests | Covers |
| --- | --- | --- |
| [tests/detect.test.ts](../tests/detect.test.ts) | 20 | signals, the confidence ladder, `PATHEXT`, self-detection |
| [tests/hosts.test.ts](../tests/hosts.test.ts) | 20 | adapters, layouts, per-scope paths and invocations |
| [tests/render.test.ts](../tests/render.test.ts) | 19 | the unified pipeline, the fixed-point property, `$` escaping |
| [tests/manifest.test.ts](../tests/manifest.test.ts) | 15 | write/load/diff, version refusal, managed-region hashing |
| [tests/wizard.test.ts](../tests/wizard.test.ts) | 9 | the four steps against `ScriptedWizardIO` |
| [tests/install-commands.test.ts](../tests/install-commands.test.ts) | 21 | `doctor`, `sync`, `uninstall` end to end |
| [tests/init.test.ts](../tests/init.test.ts) | 18 | `init` through the real CLI: idempotence, preservation, flag errors |

---

## 11. Deferred, and standing risks

Deferred by choice, not blocked:

- **Tier A self-contained bundle** (Node SEA or `bun build --compile`) and a
  Homebrew tap / `mise` / `asdf`. Worth doing once there are users without Node
  20+; §2e already reserves the paths and semantics.

Standing risks, all live:

- **Env markers are undocumented.** `CLAUDECODE`, `CURSOR_TRACE_ID`,
  `CODEX_SANDBOX` are observed, not contracted. They pre-check a box, are
  labelled `(heuristic)` in Step 1 output, and must never cause a write without
  a Step 2 confirmation.
- **Host paths are a moving target.** opencode's `commands/` vs `command/`, and
  Cursor's skills support, have drifted across releases. `verifiedAgainst`
  records when each was last checked; treat it as an expiry date, and prefer
  reporting a layout that cannot be found over silently writing into a directory
  the host ignores.
- **`--tools all` is literal, not detected.** It writes opencode files on
  machines without opencode. That is deliberate — scripts need `all` to be
  predictable — but it means the wizard's detected default and `all` are
  different answers, and only the wizard's is evidence-based.
- **Writing under `~` is a different consent level.** Global scope must stay an
  explicit answer or an explicit flag, never inferred.
- **The installers' mitigations are load-bearing.** If checksum verification,
  version pinning, or the no-`sudo` rule is ever relaxed, §2d's argument for
  shipping an installer at all no longer holds.
