# Suggestion — two-step installation and a four-step `lambda init`

Status: suggestion. See [NOTICE.md](NOTICE.md). This revision replaces the
earlier seven-step `lambda setup` proposal and the standalone `lambda detect`
command; both are withdrawn here in favour of the shape described below.

The whole design rests on one separation:

| | What it does | What it does **not** do |
| --- | --- | --- |
| **Step 1 — install** (`npm`, `install.sh`, `install.ps1`) | Puts the `lambda` executable on the machine | Touch any host agent. No `.claude/`, no `.cursor/`, no `.agents/`, no `.opencode/` |
| **Step 2 — `lambda init`** | Detects host agents, asks which to include, asks project or global, generates the plugin package for each | Install the CLI, choose a model, or write runtime settings |

Installing the CLI is deliberately inert. Nothing reaches a host agent until a
human runs `lambda init` and answers four questions.

---

## 0. What exists today (verified in this checkout)

| Fact | Location | Consequence |
| --- | --- | --- |
| `files`, `prepublishOnly`, `license: Apache-2.0` present; `private` gone | [package.json](../../package.json) | Publishable. `prepare` still absent, so `npm i -g git+…` installs a `bin` with no build behind it. |
| `version` is `"0.0.0"` | [package.json](../../package.json) | [cli.ts](../../src/cli.ts) reads it via `createRequire`, so `--version` can no longer *drift* — but the value it faithfully reports is still `0.0.0`. |
| `bin.lambda` → `./dist/cli.js`; `dist/` gitignored and untracked | [package.json](../../package.json), [.gitignore](../../.gitignore) | Solved for the npm tarball by `files`; unsolved for git-URL installs. |
| `init` hard-fails without `--tools`: *"this CLI has no interactive tool selection"* | [init.ts:146](../../src/cli-commands/init.ts#L146) | The exact statement this proposal reverses — carefully, see §2.5. |
| Targets are **project-relative only**; `TargetDefinition` is an object literal with four closures | [targets.ts](../../src/init/targets.ts) | No global surface, no detection hook, no place to hang per-scope behaviour. |
| Three hosts: `claude`, `cursor`, `codex` | [targets.ts:4](../../src/init/targets.ts#L4) | opencode absent. |
| **Zero detection code** anywhere | — | `--tools all` writes Cursor files on a machine with no Cursor. |
| Text generation is string concatenation: `yamlFrontmatter` via `JSON.stringify`, `renderManagedHead` via `Array.join`, merge via `String.indexOf` | [targets.ts:15](../../src/init/targets.ts#L15), [managed-block.ts:20](../../src/init/managed-block.ts#L20), [managed-block.ts:39](../../src/init/managed-block.ts#L39) | Workflow bodies are written verbatim to every host, so a body **cannot** mention its own invocation syntax — the one thing that differs per host. |
| Settings are init-scoped in `<cwd>/.recursive-praxis/config.json`; secrets env-only | [settings.ts](../../src/config/settings.ts) | Per-project. No user-level default exists. |
| `@opentelemetry/api`, `@opentelemetry/sdk-node`, `better-sqlite3`, `commander`, `zod-to-json-schema` are declared and imported by **no** source file | `package.json` vs `src/` (verified by grep) | `better-sqlite3` is native: every installer pays a `node-gyp` compile for a dependency nothing uses. |
| Nothing records what `init` wrote | — | Uninstall and update have no ground truth to act on. §7. |

The dependency row is still the cheapest, highest-leverage fix and blocks
nothing. It is also a **precondition** for §1: a native module cannot be
bundled into a single-file release artifact.

---

## 1. Step 1 — distribution

Three channels, one install location, one uninstall path.

### 1a. npm — the primary channel

```sh
npm install -g recursive-praxis     # then: lambda init
npx recursive-praxis init           # no global install
```

Remaining work: bump `version` off `0.0.0`, add `"prepare": "npm run build"`
so git-URL installs produce a real `dist/cli.js`, and drop the five unused
dependencies first so no install shells out to `node-gyp`.

### 1b. `install.sh` — macOS and Linux

Modeled on [codegraph's installer](https://github.com/colbymchenry/codegraph/blob/main/install.sh),
whose shape is worth copying because it solves version pinning, upgrade, and
removal in one file:

```
1. Detect platform      uname -s → darwin|linux ; uname -m → arm64|x64
                        unsupported → exit non-zero, name what was seen
2. Resolve version      LAMBDA_VERSION, else the GitHub "releases/latest"
                        redirect (avoids API rate limits), else the API.
                        Normalize "0.2.0" → "v0.2.0"
3. Download             …/releases/download/$version/lambda-$target.tar.gz
                        → verify against the published SHA256SUMS (§1e)
                        → extract to a temp dir
4. Place                mv into $INSTALL_DIR/versions/$version
5. Link                 $BIN_DIR/lambda → …/versions/$version/bin/lambda
                        $INSTALL_DIR/current → …/versions/$version
6. Prune                remove version dirs other than the new one
7. Verify PATH          warn if $BIN_DIR is not on PATH, and warn if another
                        `lambda` shadows this one (command -v lambda)
```

| Variable | Purpose | Default |
| --- | --- | --- |
| `LAMBDA_VERSION` | release tag to install | latest |
| `LAMBDA_INSTALL_DIR` | versioned bundles | `~/.recursive-praxis-cli` |
| `LAMBDA_BIN_DIR` | symlink location | `~/.local/bin` |

`install.sh --uninstall` removes `$BIN_DIR/lambda` and `$INSTALL_DIR`, and
prints that host-agent files are **not** touched — `lambda uninstall` (§9) is
the command for those. Two removals, because there were two installs.

> `~/.recursive-praxis-cli`, not `~/.recursive-praxis`: the latter is already
> the per-project session directory name ([settings.ts:27](../../src/config/settings.ts#L27)).
> Reusing it would collide the moment someone runs `lambda` from `$HOME`.

### 1c. `install.ps1` — Windows

Same seven phases, Windows-native placement:

| Concern | Choice |
| --- | --- |
| Install dir | `$env:LOCALAPPDATA\RecursivePraxis\versions\<version>` (`LAMBDA_INSTALL_DIR` overrides) |
| Shim | `lambda.cmd` in `$env:LOCALAPPDATA\RecursivePraxis\bin` — a `.cmd` shim, not a symlink, since symlink creation needs Developer Mode or elevation |
| PATH | append the bin dir to the **user** PATH via `[Environment]::SetEnvironmentVariable(..., 'User')`; never machine-wide, never elevated |
| Download | `Invoke-WebRequest`; verify with `Get-FileHash -Algorithm SHA256` |
| Uninstall | `install.ps1 -Uninstall` — remove the tree, strip the PATH entry |
| TLS | do not lower `[Net.ServicePointManager]::SecurityProtocol`; require PowerShell 5.1+ |

### 1d. Clone + `npm link` — the contributor path

Stays documented in [CONTRIBUTING.md](../../CONTRIBUTING.md), not in the README
quick start.

### 1e. The piped-installer concern, and how to answer it

An earlier revision of this document argued *against* a shell installer: piping
a remote script to a shell executes unpinned, unread code with the user's
privileges, which sits badly with a runtime whose premise is bounded, auditable
execution ([SECURITY.md](../../SECURITY.md)). That concern is real and the
requirement to ship `install.sh`/`install.ps1` is a deliberate decision to
accept it. What follows makes the accepted risk as small as it can be:

- **Publish and verify `SHA256SUMS`.** codegraph's installer verifies nothing
  and leans entirely on HTTPS. Ours should fail closed on a hash mismatch. This
  is the one place where copying the reference implementation is wrong.
- **Document the read-then-run form first**, with the pipe as the shorter
  alternative rather than the headline:
  ```sh
  curl -fsSLO https://…/install.sh && less install.sh && sh install.sh
  ```
- **Pin by default in CI examples**: `LAMBDA_VERSION=v0.2.0 sh install.sh`.
- **No `sudo`, ever.** Everything lands under `$HOME`. An installer that asks
  for elevation to write `/usr/local/bin` should instead print the `LAMBDA_BIN_DIR`
  override.
- **Serve over HTTPS from the release host only**, and never fetch a second
  script from inside the first.

### 1f. What the release artifact has to be

The codegraph shape assumes a self-contained bundle that needs no Node. Two
tiers, and the choice should be explicit rather than accidental:

| | Tier A — self-contained | Tier B — Node-requiring |
| --- | --- | --- |
| Artifact | `esbuild --bundle` + Node SEA (or `bun build --compile`) | `dist/` + a launcher that runs the system `node` |
| User needs Node? | No | Yes, ≥ 20 |
| Blocked by | Any native dependency — i.e. `better-sqlite3` must go first | Nothing |
| Effort | Real: new build pipeline, per-platform CI matrix | Small |

Recommendation: ship **Tier B first** with Tier A's exact paths, env vars, and
uninstall semantics, so the upgrade to Tier A is a change of artifact, not a
change of UX. Homebrew tap / `mise` / `asdf` remain better long-term answers and
are unaffected by either choice.

---

## 2. Step 2 — `lambda init`, a four-step wizard

Exactly four questions, in this order. No other prompt exists.

```
Step 1  Detect       find host agents on this machine and in this project
Step 2  Which hosts  human confirms/edits the selection
Step 3  Which scope  global (this machine) or per-project (this repo)
Step 4  Generate     write the plugin package for each selected host
```

### 2.1 Step 1 — detect

Detection runs inside `init`; there is **no** `lambda detect` command. Evidence
is printed, never a bare verdict, so the human can disagree with it in Step 2:

```
$ lambda init

Step 1/4 — Detecting host agents

  Claude Code   running here   CLAUDECODE=1 (heuristic) · ~/.claude/ · ./.claude/
  Cursor        installed      /usr/local/bin/cursor-agent
  Codex CLI     configured     ~/.codex/
  opencode      not found      —
```

The ladder and the auto-select rule are in §4.

### 2.2 Step 2 — which hosts

```
Step 2/4 — Which host agents should RecursivePraxis configure?

  [x] Claude Code   (detected: running here)
  [x] Cursor        (detected: installed)
  [ ] Codex CLI     (detected: configured — not selected by default)
  [ ] opencode      (not found on this machine)

  space toggles · enter confirms
```

Detection sets the **default checkbox state only**. Every host stays selectable,
including undetected ones — a human installing ahead of a host is a legitimate
case, and refusing it would make detection authoritative over its own user.

### 2.3 Step 3 — which scope

```
Step 3/4 — Where should these be installed?

  ( ) Per-project   ./.claude/ ./.cursor/ …          — this repository only
  (•) Global        ~/.claude/ ~/.cursor/ …          — every project on this machine
```

Consent differs between the two, so the wizard never infers this from
detection: writing under `~` is a different act from writing in the repository
the human is standing in.

### 2.4 Step 4 — generate

```
Step 4/4 — Generating

  Claude Code   ~/.claude/skills/recursive-praxis/
                  .claude-plugin/plugin.json      created
                  skills/status/SKILL.md          created
                  … 6 more                        created
  Cursor        ~/.cursor/skills/…                created

  Invoke with:  /recursive-praxis:status   (Claude Code)
                /praxis-status             (Cursor)

  Recorded in ~/.recursive-praxis-cli/install.json — `lambda doctor` verifies,
  `lambda sync` refreshes, `lambda uninstall` removes.
```

No confirmation prompt precedes this step. Writing is safe by construction: the
managed-marker merge preserves anything a user appended and reports `skipped`
for a file it does not own ([managed-block.ts](../../src/init/managed-block.ts),
[write.ts](../../src/init/write.ts)). A separate preview step would be
ceremony over an operation that already cannot clobber.

### 2.5 Non-interactive `init` — the existing contract survives

The `--tools` requirement is not removed; it is made conditional on there being
nobody to ask.

```sh
lambda init                                        # TTY → four steps
lambda init --tools claude,cursor --scope global   # no prompts, fully scripted
lambda init --tools all --scope project --json     # CI
```

- **TTY present** → the wizard runs. Flags pre-answer their step and skip it.
- **No TTY, flags complete** → run silently, exit 0.
- **No TTY, flags missing** → exit non-zero naming the missing flags. Same
  fail-closed posture as `Settings.require`.

This keeps [init.ts:146](../../src/cli-commands/init.ts#L146)'s guarantee where
it matters and, usefully, keeps its test passing unchanged: `spawnSync` gives
the child no TTY, so `lambda init` with no flags still errors under test.

The wizard prints the equivalent flag line on completion. Anything it can do, a
flag line can do — it has no private capability.

### 2.6 What is deliberately **not** a step

| Not a step | Why | Where it lives instead |
| --- | --- | --- |
| Model host / Ollama / model name | Not needed to configure a host agent; the runtime already defaults to local Ollama | `--host` / `--model` / `--ollama-url` remain **flags** on `init`, prompting nothing (§11) |
| Settings review | Same | `lambda status`, `lambda doctor` |
| Preview / dry-run confirmation | Writes are non-destructive by construction (§2.4) | — |
| Preflight (node version, git repo) | Assertions, not questions. Fail at the point of failure with a real message | — |
| Smoke test | Verification is a separate concern with its own command | `lambda doctor` |

---

## 3. Host surfaces per scope

Verified against each vendor's current documentation. Paths the tool writes are
the *only* contract that matters at generation time, so they are stated here
rather than inferred at runtime.

| Host | Project scope | Global scope | Invocation |
| --- | --- | --- | --- |
| **Claude Code** | `.claude/skills/recursive-praxis-<id>/SKILL.md` + `.claude/commands/praxis/<id>.md` (standalone, as today) | `~/.claude/skills/recursive-praxis/` as a **skills-directory plugin**: `.claude-plugin/plugin.json` + `skills/<id>/SKILL.md` | `/praxis:<id>` (project) · `/recursive-praxis:<id>` (global plugin namespace) |
| **Cursor** | `.cursor/skills/recursive-praxis-<id>/SKILL.md` + `.cursor/commands/praxis-<id>.md` | `~/.cursor/…` (same shape) | `/praxis-<id>` |
| **Codex CLI** | `.agents/skills/recursive-praxis-<id>/SKILL.md` | **`~/.agents/skills/…`** — *not* `~/.codex/skills/` | `$recursive-praxis-<id>` |
| **opencode** | `.opencode/commands/praxis-<id>.md` | `~/.config/opencode/commands/praxis-<id>.md` | `/praxis-<id>` |

Three findings behind that table:

1. **Claude Code global scope should be a real plugin, not loose files.**
   `claude plugin init <name>` scaffolds `~/.claude/skills/<name>/` containing
   `.claude-plugin/plugin.json`; it auto-loads with no marketplace and no
   install step, and namespaces every skill as `/<plugin-name>:<skill>`. That is
   precisely "generate a plugin package for the host agent," and it is strictly
   better than scattering seven sibling directories through `~/.claude/skills/`.
   `plugin.json` also carries `version`, which gives `lambda doctor` and
   `lambda sync` a version to compare against.
2. **Codex user-level skills live at `~/.agents/skills`.** Codex scans
   `.agents/skills` upward from cwd, then `$HOME/.agents/skills`, then
   `/etc/codex/skills`. The earlier revision of this document listed
   `~/.codex/skills/` — that was wrong and would have written a directory Codex
   never reads.
3. **opencode has commands, not skills.** It takes markdown with `description`
   frontmatter; the filename is the command name. So opencode gets the command
   surface only, exactly as Codex gets the skill surface only.

Two detection traps, unchanged and still worth naming:

- **`AGENTS.md` is not a Codex signal.** It is a cross-vendor convention that
  several hosts read. Treating it as proof of Codex writes Codex files on
  machines that have never run Codex.
- **`.agents/skills/` is what our own `init` writes.** Counting it as detection
  makes the tool detect itself. Classify our own paths as
  `already-initialized`, never as `host-present`.

`.opencode/commands/` vs `.opencode/command/` (singular) has drifted across
opencode releases; whichever is chosen, resolve it once in
`OpencodeAdapter.layout()` and note the version verified against.

---

## 4. Detection, without a `detect` command

Detection is a method on the host object (§5), not a command and not a switch
statement in the wizard.

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

¹ excluded when it holds only our own managed files — see the second trap in §3.

```
running-here   env marker present            → strongest; this host is executing us now
active-here    project-local config dir      → this repo is already used with this host
installed      binary on PATH                → host is on the machine
configured     user-level config dir         → host has been run at least once
absent         no signal
```

**Default-checked** in Step 2: `running-here`, `active-here`, and
`installed ∧ configured`. **Offered unchecked**: `installed` xor `configured`
alone, and `absent`. The human's Step 2 answer is final — detection only
chooses where the cursor starts.

---

## 5. The OOP refactor

### 5.1 What has to change and why

[targets.ts](../../src/init/targets.ts) is an object literal with four closures
and no state. It has nowhere to put detection probes, nowhere to put per-scope
paths, and nowhere to put a per-host render pipeline; adding any of the three
means a parallel `Record<ToolId, …>` beside it, and adding all three means the
"one host = one place" property is gone. `buildPlan` would grow a `scope`
parameter and a set of `if (toolId === …)` branches.

The fix is to make a host a **class**, so a new host is one file and adding
opencode touches nothing else.

### 5.2 The host hierarchy

```ts
// src/hosts/HostAdapter.ts
export type HostId = "claude" | "cursor" | "codex" | "opencode";
export type Scope = "project" | "global";

/** Everything the outside world supplies. Injected, so tests need no real fs. */
export interface HostContext {
  readonly env: NodeJS.ProcessEnv;
  readonly home: string;
  readonly projectRoot: string;
  readonly platform: NodeJS.Platform;
  readonly exists: (absPath: string) => boolean;
  readonly onPath: (binary: string) => string | undefined;   // honours PATHEXT
}

export abstract class HostAdapter {
  abstract readonly id: HostId;
  abstract readonly label: string;

  // --- the three things that actually differ per host ---------------------
  /** Step 1: raw evidence. Never decides anything. */
  protected abstract probes(ctx: HostContext): readonly HostSignal[];
  /** Step 4: where this host's package lives at this scope. */
  abstract layout(ctx: HostContext, scope: Scope): HostLayout;
  /** Step 4: how a workflow becomes this host's file. §6. */
  abstract pipeline(scope: Scope): DocumentPipeline;
  /** What the human types once it is installed. */
  abstract invocation(workflowId: string, scope: Scope): string;

  // --- template methods: identical for every host, overridden by none -----
  detect(ctx: HostContext): HostDetection {
    const signals = this.probes(ctx);
    const confidence = rankConfidence(signals);
    return {
      hostId: this.id, label: this.label, signals, confidence,
      defaultSelected: autoSelects(confidence),
      alreadyInitialized: this.layout(ctx, "project").ownsAnyExistingFile(ctx),
    };
  }

  plan(workflows: readonly WorkflowDefinition[], ctx: HostContext, scope: Scope): readonly PlannedFile[] {
    const layout = this.layout(ctx, scope);
    const render = this.pipeline(scope);
    return [
      ...layout.manifestFiles(),                       // plugin.json, where a host has one
      ...workflows.flatMap((w) => layout.filesFor(w).map((f) => ({
        ...f, hostId: this.id, content: render.render(w),
      }))),
    ];
  }
}
```

`probes` is `protected` and `detect` is `final` in spirit: a host contributes
evidence, and the confidence ladder is decided in exactly one place. That is
the property the current design cannot have — with a `Record` of literals, every
host could rank itself differently.

Each concrete adapter is then small and self-contained:

```ts
// src/hosts/ClaudeCodeAdapter.ts
export class ClaudeCodeAdapter extends HostAdapter {
  readonly id = "claude" as const;
  readonly label = "Claude Code";

  protected probes(ctx: HostContext) {
    return [
      envSignal(ctx, "CLAUDECODE"),
      envSignal(ctx, "CLAUDE_CODE_ENTRYPOINT"),
      binarySignal(ctx, "claude"),
      configSignal(ctx, path.join(ctx.home, ".claude")),
      projectSignal(ctx, ".claude"),
    ].filter(isPresent);
  }

  layout(ctx: HostContext, scope: Scope): HostLayout {
    return scope === "global"
      // a real Claude Code skills-directory plugin — §3
      ? new PluginLayout(path.join(ctx.home, ".claude", "skills", "recursive-praxis"))
      : new StandaloneLayout(ctx.projectRoot, ".claude");
  }

  invocation(workflowId: string, scope: Scope) {
    return scope === "global" ? `/recursive-praxis:${workflowId}` : `/praxis:${workflowId}`;
  }

  pipeline(scope: Scope) {
    return DocumentPipeline.for(this, scope, { frontmatter: ["name", "description"] });
  }
}
```

`HostLayout` is its own small hierarchy (`StandaloneLayout`, `PluginLayout`,
`CommandsOnlyLayout`) because "a plugin directory with a manifest" and "loose
files under a dot-directory" are genuinely different structures, not two
configurations of one.

### 5.3 Registry

```ts
// src/hosts/HostRegistry.ts
export class HostRegistry {
  private readonly byId: ReadonlyMap<HostId, HostAdapter>;
  static default(): HostRegistry {
    return new HostRegistry([
      new ClaudeCodeAdapter(), new CursorAdapter(),
      new CodexAdapter(), new OpencodeAdapter(),
    ]);
  }
  all(): readonly HostAdapter[];
  get(id: HostId): HostAdapter | undefined;
  detectAll(ctx: HostContext): readonly HostDetection[];
}
```

Adding a fifth host = one new file + one line here. `parseToolsValue`, the
wizard, `doctor`, `sync`, and `uninstall` need no edits — which is the whole
argument for putting detection, layout, and rendering *on the host object*
rather than in the callers.

### 5.4 The wizard as objects

```ts
// src/init/steps/InitStep.ts
export abstract class InitStep<In, Out> {
  abstract readonly ordinal: number;      // 1..4, printed as "Step 2/4"
  abstract readonly title: string;
  abstract run(input: In, io: WizardIO): Promise<Out>;
}

export class DetectHostsStep  extends InitStep<void, DetectionReport> {}
export class ChooseHostsStep  extends InitStep<DetectionReport, readonly HostAdapter[]> {}
export class ChooseScopeStep  extends InitStep<readonly HostAdapter[], Scope> {}
export class GenerateStep     extends InitStep<Selection, InitReport> {}

// src/init/InitWizard.ts
export class InitWizard {
  constructor(
    private readonly registry: HostRegistry,
    private readonly ctx: HostContext,
    private readonly io: WizardIO,
    private readonly writer: FileWriter,
  ) {}

  async run(): Promise<InitReport> {
    const detected  = await new DetectHostsStep(this.registry).run(undefined, this.io);
    const hosts     = await new ChooseHostsStep().run(detected, this.io);
    const scope     = await new ChooseScopeStep().run(hosts, this.io);
    return new GenerateStep(this.writer).run({ hosts, scope }, this.io);
  }
}
```

The four steps are visible as four lines. Reordering them, or proving that no
fifth step exists, is a code review of one method.

### 5.5 `WizardIO` — the port that makes both modes one code path

```ts
export interface WizardIO {
  note(line: string): void;
  table(rows: readonly EvidenceRow[]): void;
  multiSelect(q: string, options: readonly Choice[]): Promise<readonly string[]>;
  singleSelect(q: string, options: readonly Choice[]): Promise<string>;
}

export class TtyWizardIO implements WizardIO { /* readline, no dependency needed */ }

/** Non-interactive: every answer pre-supplied by flags. A question with no
 *  flag behind it throws NeedsFlagError naming the exact flag — never a
 *  silent default, never a hang on a closed stdin. */
export class FlagWizardIO implements WizardIO { constructor(answers: FlagAnswers) {} }

/** Tests: scripted answers, asserts every question was consumed. */
export class ScriptedWizardIO implements WizardIO {}
```

One wizard, three drivers. `--tools`/`--scope` are not a parallel code path —
they are a `WizardIO` implementation, so interactive and scripted `init` cannot
drift apart. `ScriptedWizardIO` means the four steps are unit-testable with no
TTY, no filesystem, and no subprocess, which is what the current
`spawnSync`-based init tests have to reach for today.

### 5.6 Directory layout

```
src/hosts/                 HostAdapter, HostRegistry, one file per host, layouts
src/detect/                HostSignal, confidence ladder, HostContext (fs/env probes)
src/init/                  InitWizard, steps/, WizardIO implementations, FileWriter
src/render/                DocumentPipeline + unified plugins (§6)
src/manifest/              InstallManifest read/write/diff (§7)
src/cli-commands/          init.ts, doctor.ts, uninstall.ts, sync.ts — thin
```

`init.ts` shrinks to argument parsing, choosing a `WizardIO`, and printing an
`InitReport`. `plan.ts`, `targets.ts`, and `tools-flag.ts` fold into
`src/hosts/`; `managed-block.ts` and `write.ts` move under `src/render/` and
`src/init/` respectively, keeping their current semantics (§6 changes how the
block is *produced*, not what it guarantees).

---

## 6. Text generation with `unified`

### 6.1 Why, concretely

Today [workflows.ts](../../src/init/workflows.ts) bodies are written verbatim to
every host, and per-host variation is confined to a YAML frontmatter line built
with `JSON.stringify`. That has one specific, visible cost: **a workflow body
cannot tell the reader how to invoke it**, because the invocation is the one
thing that differs per host (`/praxis:status` vs `/praxis-status` vs
`$recursive-praxis-status` vs, at global scope, `/recursive-praxis:status`).
Every workflow currently works around this by never mentioning it.

A `unified` pipeline makes that a transform instead of a taboo. Authors write:

```md
Run {{invoke:status}} before proposing any operator.
```

and `remarkPraxisInvocation` replaces the node per host and scope. Same source,
four correct outputs.

### 6.2 The pipeline

```ts
// src/render/DocumentPipeline.ts
export class DocumentPipeline {
  private constructor(private readonly processor: Processor) {}

  static for(host: HostAdapter, scope: Scope, opts: HostRenderOptions): DocumentPipeline {
    return new DocumentPipeline(
      unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkFrontmatter, ["yaml"])
        .use(remarkPraxisFrontmatter, { host, scope, fields: opts.frontmatter })
        .use(remarkPraxisInvocation, { host, scope })   // {{invoke:id}} → host syntax
        .use(remarkPraxisManagedBlock)                  // marker HTML nodes + notice
        .use(remarkStringify, { bullet: "-", fence: "`", rule: "-", emphasis: "_" })
        .freeze(),
    );
  }

  render(workflow: WorkflowDefinition): string;
  /** Parses an on-disk file and returns just the managed region's AST. */
  parseManaged(existing: string): Root | undefined;
}
```

Each `remarkPraxis*` plugin is a small unit-testable function over mdast, and
per-host differences become plugin *options* rather than string branches.

A second, quieter win: because the managed region is a node range rather than a
byte offset, `lambda doctor` can report drift **semantically** — "the `## Command`
section was edited" instead of "bytes differ" — while still using a content hash
as the trigger. `mergeManaged`'s public guarantees are unchanged: content after
`MARKER_END` survives verbatim, and a file without markers is never touched.

### 6.3 Dependencies

`unified`, `remark-parse`, `remark-stringify`, `remark-frontmatter`,
`remark-gfm`, `unist-util-visit`, `yaml` — all pure JS ESM, no native build, no
`node-gyp`. That is consistent with §1's requirement that the install stay
toolchain-free, and it is a net simplification of the dependency list once the
five unused packages go. It does add ~15 transitive packages to the tarball;
worth stating in the PR, not worth blocking on.

### 6.4 Two traps, both real

1. **Byte output changes once.** `remark-stringify` normalizes markdown —
   bullet characters, escaping, blank lines. Every generated file's bytes will
   change on the first run after this lands, and the byte-stability assertions
   in [init.test.ts](../../tests/init.test.ts) need a single re-baseline. Guard
   it afterwards with a fixed-point property test:
   `render(w) === stringify(parse(render(w)))` for every workflow × host ×
   scope. Without that test, an idempotent `init` silently becomes a churning one.
2. **Escaping will bite `$` and `[`.** Codex's invocation is
   `$recursive-praxis-status`, opencode templates use `$ARGUMENTS`, and Claude
   skills use `$ARGUMENTS` too. `remark-stringify` escapes text-node
   punctuation. Emit these as `inlineCode`/`code` nodes rather than raw text and
   assert the exact rendered string in a test per host — do not discover this in
   a user's terminal.

---

## 7. The install manifest — what makes §8–§10 honest

`doctor`, `uninstall`, and `sync` all need to know *what was actually written,
by which version, at which scope*. Nothing records that today, so each would
otherwise have to re-derive paths from the current host table — which drifts
between releases and leaves orphans behind after any rename.

```jsonc
// project scope: <projectRoot>/.recursive-praxis/install.json
// global  scope: ~/.recursive-praxis-cli/install.json
{
  "manifestVersion": 1,
  "lambdaVersion": "0.2.0",
  "scope": "global",
  "hosts": [
    {
      "id": "claude",
      "detectedAs": "running-here",
      "root": "~/.claude/skills/recursive-praxis",
      "files": [
        { "path": ".claude-plugin/plugin.json", "kind": "manifest", "sha256": "…" },
        { "path": "skills/status/SKILL.md",     "kind": "skill",    "sha256": "…" }
      ]
    }
  ]
}
```

The hash is of the **managed region only**, so appended user content never reads
as drift. With this file: `uninstall` removes a known list instead of guessing,
`sync` re-runs generation with the recorded answers and no prompts, and `doctor`
can name *orphans* — files a previous version wrote that this version no longer
plans. None of the three is trustworthy without it.

---

## 8. `lambda doctor`

```
$ lambda doctor
runtime      node v22.3.0 (>=20 ok) · lambda 0.2.0 (~/.local/bin/lambda)
install      global   ~/.recursive-praxis-cli/install.json   written by 0.1.0
hosts        Claude Code running-here · Cursor installed · Codex configured · opencode absent
files        13 managed · 1 drifted · 1 orphaned · 1 skipped
               drifted   ~/.claude/skills/recursive-praxis/skills/ir/SKILL.md
                         (managed region edited by hand — `lambda sync` will overwrite)
               orphaned  ~/.claude/skills/recursive-praxis-solve/SKILL.md
                         (written by 0.1.0; not planned by 0.2.0 — `lambda uninstall --prune`)
               skipped   ./.cursor/skills/…/SKILL.md (no managed markers — not ours)
config       .recursive-praxis/config.json   defaultHost=ollama (default)
version      manifest 0.1.0 < cli 0.2.0 — run `lambda sync`
```

Four things nothing catches today: drift, orphans from a previous version, a
manifest older than the CLI, and a host whose files exist but whose binary has
since disappeared. Exit non-zero on any of them so it works as a CI check.

`doctor` is also where detection output lands now that there is no `lambda detect` —
it is the scriptable, bug-report-friendly view of the same evidence, which was
the original argument for a separate command.

## 9. `lambda uninstall`

```sh
lambda uninstall                          # everything in the manifest for this scope
lambda uninstall --tools cursor           # one host
lambda uninstall --scope global           # the other manifest
lambda uninstall --prune                  # orphans only; leave the current install
```

Removal rules, which are `mergeManaged`'s invariant applied in reverse:

- Delete a file only if it is **in the manifest**, still carries both markers,
  and has **no content after `MARKER_END`**. Anything appended means the file is
  the user's now.
- Print what was kept and why — a kept file is a result, not a failure.
- Remove now-empty directories we created; never one we did not.
- Say plainly at the end that the `lambda` binary is still installed, and name
  `install.sh --uninstall` / `npm uninstall -g recursive-praxis`. Two installs,
  two removals (§1b).

## 10. `lambda sync` (alias `lambda update`)

```sh
lambda sync                # regenerate every managed file from the manifest
lambda sync --scope global
lambda sync --check        # exit non-zero if anything would change; CI-friendly
```

Re-runs Step 4 with the manifest's recorded hosts and scope, asks nothing, and
refreshes managed regions in place. This is what a human wants after upgrading
the CLI, and what CI wants as a "generated files are current" gate.

**A naming decision to make deliberately:** `lambda update` reads to most people
as "update the CLI itself", which this does not do — upgrading the binary is
`install.sh` re-run or `npm i -g`. Recommendation: `sync` is the real name,
`update` is an alias, and `update`'s help text says in one line which one it is
and how to do the other. The alternative — making `lambda update` self-update —
means the CLI rewrites its own binary, which is a materially larger security
surface for a runtime whose premise is bounded execution.

---

## 11. Compatibility accounting

Honest list of what changes for anyone already using `lambda init`:

| Change | Impact | Mitigation |
| --- | --- | --- |
| `init` becomes interactive on a TTY | New behaviour, not removed behaviour | Flags still bypass it entirely; no-TTY + no-flags still errors (§2.5) |
| `--scope` added | Defaults to `project` | Existing invocations behave identically |
| `--host` / `--model` / `--ollama-url` stay as flags but are not wizard steps | None — they never prompted | Per the requirement that setup asks nothing about models. `Settings` and its tests are untouched |
| `opencode` joins `TOOL_IDS` | `--tools all` starts writing opencode files, including on machines without opencode | Keep `all` literal and predictable for scripts; make the *wizard's* default the detected set (§4). Flag it in the release note |
| Generated bytes change once (`unified`) | Every managed file refreshes on the next `init`/`sync` | Expected and non-destructive; re-baseline the byte-stability tests once and add the fixed-point property test (§6.4) |
| Claude Code global scope emits a plugin, not loose skills | Different invocation prefix at global scope (`/recursive-praxis:status`) | Documented in the Step 4 output; project scope is unchanged |
| `install.json` appears | New file in `.recursive-praxis/` | Add to the generated `.gitignore` guidance, or commit it deliberately for per-project installs — decide before shipping |

---

## 12. Suggested order

| Phase | Work | Unblocks | Independently shippable? |
| --- | --- | --- | --- |
| 1 | Drop the 5 unused deps; add `prepare`; set a real `version` | any install at all; Tier A later | Yes |
| 2 | `src/hosts/` — `HostAdapter`, layouts, registry, 4 adapters incl. opencode; `buildPlan` → `HostAdapter.plan` | everything below | Yes — pure refactor, existing CLI surface unchanged |
| 3 | `src/render/` — `DocumentPipeline` on unified; re-baseline bytes; fixed-point test | per-host invocation text; semantic drift | Yes |
| 4 | `src/detect/` — signals, ladder, `HostContext` | Step 1 of the wizard | Yes (surfaced first through `doctor`) |
| 5 | `src/manifest/` — `install.json` write on init | doctor / uninstall / sync | Yes |
| 6 | `InitWizard` + 4 steps + `WizardIO`; `--scope` | the four-step experience | Yes |
| 7 | `lambda doctor`, `lambda uninstall`, `lambda sync` | verifiable, reversible installs | Yes |
| 8 | `install.sh`, `install.ps1`, `SHA256SUMS`, release CI (Tier B) | machine-wide install without npm | Yes |
| 9 | Tier A self-contained bundle; Homebrew / mise | users without Node | Later |

Phases 2–5 are invisible to users and land safely one at a time. The wizard
(6) is the first phase anyone notices.

---

## 13. Open questions and risks

- **Env markers are undocumented.** `CLAUDECODE`, `CURSOR_TRACE_ID`,
  `CODEX_SANDBOX` are observed, not contracted. They may pre-check a box and
  must be labelled `(heuristic)` in Step 1 output; they must never cause a write
  without a human's Step 2 confirmation.
- **Writing under `~` is a different consent level.** Global scope must always
  be an explicit Step 3 answer or an explicit `--scope global`, never inferred
  from detection.
- **Host paths are a moving target.** opencode's `commands/` vs `command/`, and
  Cursor's skills support, have drifted across releases. Each adapter should
  record the vendor version its paths were verified against, and `doctor` should
  report a layout it cannot find rather than silently writing into a directory
  the host ignores.
- **`--tools all` after opencode lands** writes files for a host most machines
  do not have. See §11.
- **Windows.** `onPath` must respect `PATHEXT`; `install.ps1` must not require
  elevation; the config paths in §3–§4 are POSIX-shaped and need Windows
  equivalents (`%USERPROFILE%\.claude`, `%APPDATA%\…`). Detection should return
  `absent` rather than guess on an unhandled platform.
- **A piped shell installer remains a real risk**, accepted deliberately and
  mitigated in §1e. If the mitigations (checksums, pinning, no `sudo`) are not
  implemented, the installer is worse than not shipping one.
- **`prepare` runs in consumers' installs**, requiring `typescript` at install
  time from a git URL. Acceptable pre-publish; once published, `files: ["dist"]`
  means the tarball already contains the build and `prepare` is skipped.
