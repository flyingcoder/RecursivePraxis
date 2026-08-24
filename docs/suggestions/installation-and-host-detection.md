# Suggestion — installing RecursivePraxis, with staged setup and host-agent detection

Status: suggestion. Part of §1a has since landed (`private` removed, `files`,
`prepublishOnly`, `license: Apache-2.0`, and a version read from package.json);
the rest — detection, wizard, doctor, user scope — is unimplemented.
See [NOTICE.md](NOTICE.md).

Covers three separate problems that today's `lambda init` conflates or skips:

1. **Distribution** — how the `lambda` binary gets onto a machine at all.
2. **Setup** — a staged, confirmable flow for choosing host agents, model host,
   model, and scope.
3. **Detection** — deciding *which* agent surfaces to write, from evidence
   rather than from a flag the operator has to know how to spell.

---

## 0. What exists today (verified in this checkout)

| Fact | Location | Consequence |
| --- | --- | --- |
| ~~`"private": true`, no `files`, no `prepublishOnly`~~ — **fixed**; `prepare` still absent | [package.json](../../package.json) | Publishable now. `npm i -g git+…` still installs a bin with no build behind it. |
| `bin.lambda` → `./dist/cli.js`, and `dist/` is gitignored + untracked | [package.json](../../package.json), [.gitignore](../../.gitignore) | Solved for the npm tarball by `files`; **not** solved for git-URL installs, which need `prepare`. |
| `init` hard-fails without `--tools`: *"this CLI has no interactive tool selection"* | [init.ts:146](../../src/cli-commands/init.ts#L146) | Deliberate. Any wizard must not break this contract. |
| Targets are **project-relative only** (`.claude/`, `.cursor/`, `.agents/`) | [targets.ts](../../src/init/targets.ts) | There is no "install on the computer", only "install in this repo". |
| Settings are init-scoped in `<cwd>/.recursive-praxis/config.json`; secrets env-only | [settings.ts](../../src/config/settings.ts) | Per-project. No user-level default exists. |
| **Zero detection code** anywhere | — | `--tools all` writes Cursor files on a machine with no Cursor. |
| `@opentelemetry/*`, `better-sqlite3`, `commander`, `zod-to-json-schema` are declared but imported by **no** source file | `package.json` vs `src/` | `better-sqlite3` is a native module: every installer pays a compile step for a dependency nothing uses. |

The last row is the cheapest, highest-leverage fix and blocks nothing: dropping
those four turns a toolchain-requiring install into a pure-JS one.

---

## 1. Distribution channels

### 1a. npm + `npx` — recommended primary

The smallest change that makes `lambda` installable:

```jsonc
{
  "name": "recursive-praxis",
  "version": "0.1.0",
  // "private": true  ← removed
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "prepublishOnly": "npm run build && vitest run",
    "prepare": "npm run build"          // makes `npm i -g git+…` work pre-publish
  }
}
```

Then both of these work:

```sh
npx recursive-praxis init --tools claude          # no install, per-project
npm install -g recursive-praxis && lambda doctor  # persistent
```

`prepare` is what fixes the gitignored-`dist` problem: it runs on `npm install`
from a git URL, so a tarball-less install still produces a real `dist/cli.js`.
Keep `dist/` out of git — build on install instead of committing artifacts.

**Precondition:** drop the four unused dependencies first, or every install
shells out to `node-gyp` for `better-sqlite3`.

### 1b. Single-file bundle — later, for the no-Node case

`esbuild --bundle --platform=node --format=esm` produces one `lambda.mjs`; a
Node SEA or `bun build --compile` produces a real binary. Worth it only once
there are users without Node 20+. Note this is *incompatible* with keeping a
native dependency — another reason 1a's cleanup comes first.

### 1c. Clone + `npm link` — the existing path, keep it documented

```sh
git clone … && cd RecursivePraxis && npm install && npm run build && npm link
```

This is the contributor path and should stay in [CONTRIBUTING.md](../../CONTRIBUTING.md),
not the README quick start.

### 1d. Explicitly not recommended: `curl … | sh`

A pipe-to-shell installer executes an unpinned remote script with the user's
privileges — inconsistent with a runtime whose whole premise is bounded,
auditable execution ([SECURITY.md](../../SECURITY.md)). If a shell installer is
ever wanted, ship it as a downloadable, checksummed file the user runs after
reading it. Homebrew tap / `mise` / `asdf` are better answers to the same want.

---

## 2. `lambda detect` — evidence-ranked host detection

Detection should be **its own command**, not a hidden phase of setup: it is
scriptable, unit-testable, and useful for bug reports on its own.

### 2a. Signals per host

Every signal is one of three kinds, and they are *not* equally trustworthy:

| Kind | Meaning | Trust |
| --- | --- | --- |
| `binary` | executable resolvable on `PATH` | high — filesystem fact |
| `config` | user- or project-level directory exists | high — filesystem fact |
| `env` | process env var set by a host that is running us *right now* | **heuristic** — undocumented, may change between host releases |

| Host | `binary` | `config` (user) | `config` (project) | `env` (heuristic) |
| --- | --- | --- | --- | --- |
| Claude Code | `claude` | `~/.claude/`, `~/.claude.json` | `.claude/` | `CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT` |
| Cursor | `cursor`, `cursor-agent` | `~/.cursor/`, `~/Library/Application Support/Cursor/`, `~/.config/Cursor/` | `.cursor/` | `CURSOR_TRACE_ID`, `CURSOR_AGENT` |
| Codex | `codex` | `~/.codex/` | `.agents/skills/` | `CODEX_SANDBOX`, `CODEX_HOME` |
| opencode *(later)* | `opencode` | `~/.config/opencode/` | `.opencode/`, `opencode.json(c)` | — |

Two traps worth naming:

- **`AGENTS.md` is not a Codex signal.** It is a cross-vendor convention; several
  hosts read it. Treating it as proof of Codex would write Codex files on
  machines that have never run Codex.
- **`.agents/skills/` is what our own `init` writes.** Counting it as detection
  makes the tool detect itself. Either exclude paths we author, or classify them
  separately as `already-initialized` rather than `host-present`.

### 2b. Confidence ladder and the auto-select rule

```
running-here   env marker present            → strongest; this host is executing us now
active-here    project-local config dir      → this repo is already used with this host
installed      binary on PATH                → host is on the machine
configured     user-level config dir         → host has been run at least once
absent         no signal
```

Proposed rule, deliberately conservative:

- **Auto-select** `running-here`, `active-here`, and (`installed` ∧ `configured`).
- **Offer unchecked** `installed` xor `configured` alone.
- **Never write** for `absent` unless named explicitly with `--tools`.

`--tools` always overrides detection. Detection chooses a *default*, never a
final answer — the same relationship `--host` has to configured settings today.

### 2c. Shape, consistent with the existing architecture

Colocate detection with the target definition so a new host is still one object,
and inject the environment so tests need no real filesystem — mirroring how
`Settings` takes an injectable `env` ([settings.ts](../../src/config/settings.ts)):

```ts
// src/init/detect.ts
export type SignalKind = "binary" | "config" | "env";
export type Confidence = "running-here" | "active-here" | "installed" | "configured" | "absent";

export interface DetectionEnv {
  readonly env: NodeJS.ProcessEnv;
  readonly home: string;
  readonly projectRoot: string;
  readonly platform: NodeJS.Platform;
  readonly exists: (absPath: string) => boolean;      // injected, no fs in tests
  readonly onPath: (binary: string) => string | undefined;
}

export interface HostSignal {
  readonly kind: SignalKind;
  readonly evidence: string;        // the literal path / var name, printable
  readonly heuristic: boolean;      // true for every `env` signal
}

export interface HostDetection {
  readonly toolId: ToolId;
  readonly toolLabel: string;
  readonly confidence: Confidence;
  readonly signals: readonly HostSignal[];
  readonly autoSelect: boolean;
  readonly alreadyInitialized: boolean;   // our own managed files are present
}

export function detectHosts(context: DetectionEnv): readonly HostDetection[];
```

`TargetDefinition` gains one member — `detectionProbes(context): HostSignal[]` —
so `TARGETS` stays the single place a host is described.

Output prints the evidence, never a bare verdict:

```
$ lambda detect
Claude Code   running-here   env CLAUDECODE=1 (heuristic) · ~/.claude/ · .claude/   [auto]
Cursor        installed      /usr/local/bin/cursor-agent                            [offer]
Codex         absent         —                                                       [skip]

Equivalent: lambda init --tools claude
```

That last line is the point of the whole design — see §3.

---

## 3. `lambda setup` — the staged flow

Keep `lambda init` exactly as it is: non-interactive, flag-driven, scriptable.
Add `lambda setup` as a **wizard that compiles down to an `init` invocation**.
It has no private capability; anything it can do, a flag line can do.

```
Step 0  Preflight     node ≥ 20 · write permission · git repo? · existing config?
Step 1  Detect        run `detectHosts`, show evidence table, confirm selection
Step 2  Scope         project (default) or user  (§4)
Step 3  Model host    ollama | anthropic | cursor | claude-ide | fake
                      → probe: GET {ollamaBaseUrl}/api/tags, or presence of
                        ANTHROPIC_API_KEY / CURSOR_API_KEY in the environment
Step 4  Model         ollama → pick from /api/tags (real list, no guessing)
                      others → typed name, validated by Settings.with()
Step 5  Preview       exact file list with created/refreshed/skipped/preserved,
                      plus a config diff — and the equivalent flag line
Step 6  Apply         only after explicit confirmation
Step 7  Verify        run `lambda doctor` (§5) and print host invocations
```

Rules that keep it honest:

- **Every step prints its flag equivalent, and step 5 prints the whole line.**
  A user can paste it into a dotfile or CI and never run the wizard again.
- **No TTY → no prompts.** If `!process.stdout.isTTY` and `--yes` was not passed,
  exit non-zero listing the flags needed. Same fail-closed posture as
  `Settings.require` ([settings.ts](../../src/config/settings.ts)).
- **`--dry-run` runs steps 0–5 and stops.** Step 5 is already a dry run; the flag
  just makes it terminal. `writePlannedFile` computes actions before writing, so
  the preview can be exact rather than predicted ([write.ts](../../src/init/write.ts)).
- **Re-running is safe by construction.** The managed-marker merge already
  preserves user content and reports `preserved` on no-ops ([managed-block.ts](../../src/init/managed-block.ts)).
- **Probes are reads only.** Listing Ollama models is a GET; no keys are
  validated by spending tokens, and no secret is ever written to `config.json` —
  `readConfigFile` already rejects that.

---

## 4. Scope: project vs user

"Install on the user's computer" needs a surface today's targets do not have.
Adding `--scope user` means a second path per target:

| Host | project | user |
| --- | --- | --- |
| Claude Code | `.claude/skills/…`, `.claude/commands/praxis/…` | `~/.claude/skills/…`, `~/.claude/commands/praxis/…` |
| Cursor | `.cursor/skills/…`, `.cursor/commands/…` | `~/.cursor/…` |
| Codex | `.agents/skills/…` | `~/.codex/skills/…` |

`TargetDefinition.skillFile(workflowId)` becomes `skillFile(workflowId, scope)`,
returning an absolute path for `user`.

**The settings consequence must be decided deliberately.** Today `Settings` has a
strong property: an init-scoped value came from exactly one file, and no stray
env var can re-point the runtime. A user-level config
(`~/.config/recursive-praxis/config.json`) layered *below* the project one keeps
secrets out of files and preserves precedence, but weakens "set here only" to
"set in one of two places". If added:

- layer order becomes `default < user file < project file < override`;
- `sourceOf()` gains `"user-file"` so provenance stays visible;
- `lambda status` and `doctor` print **which file supplied each value**.

Recommendation: ship project scope first, add user scope only once someone
actually wants RecursivePraxis in repos they do not control.

---

## 5. `lambda doctor` — verification as a first-class command

Setup that cannot be verified is setup that silently rots.

```
$ lambda doctor
runtime     node v22.3.0 (≥20 ok) · lambda 0.1.0
config      .recursive-praxis/config.json
              defaultHost   = ollama          (init)
              ollamaBaseUrl = http://127.0.0.1:11434   (default)
              ollamaModel   = llama3.2        (init)
secrets     ANTHROPIC_API_KEY unset · CURSOR_API_KEY unset
hosts       Claude Code running-here · Cursor installed · Codex absent
files       6 managed · 0 drifted · 1 skipped (.claude/skills/…/SKILL.md lacks markers)
smoke       lambda run --host fake … ok (trace 3f2a…, replay verified)
```

Three things it catches that nothing catches today:

1. **Drift** — a generated file whose markers were removed. `init` silently
   reports `skipped` and leaves it stale forever; `doctor` names it.
2. **Unreachable model host** — configured `ollama` with nothing listening.
3. **Config that will fail closed at first use** — e.g. `defaultHost=anthropic`
   with no `ANTHROPIC_API_KEY`, which today only surfaces mid-run.

Non-zero exit on failure makes it a CI check.

---

## 6. Uninstall

`--tools none` writes nothing but removes nothing. A `lambda uninstall
[--tools …] [--scope …]` should delete **only** files that still carry both
managed markers and have no content after `MARKER_END` — anything a user
appended to means the file is now theirs. Print what was kept and why. This is
the same invariant `mergeManaged` already enforces, applied in reverse.

---

## 7. opencode

The design above needs no change to absorb it: one `TargetDefinition` entry with
its paths (`.opencode/`, `~/.config/opencode/`) plus `detectionProbes`, and one
id added to `TOOL_IDS`. `parseToolsValue`, `buildPlan`, the wizard, and `doctor`
pick it up with no edits — which is the argument for putting detection inside
`TargetDefinition` rather than in a switch inside the wizard.

---

## 8. Suggested order

| Phase | Work | Unblocks |
| --- | --- | --- |
| 1 | ~~un-`private`; `files`; `prepublishOnly`; `license`~~ **done**. Remaining: drop 4 unused deps, add `prepare` | `npx` / global install at all |
| 2 | `src/init/detect.ts` + `lambda detect [--json]` | evidence before automation |
| 3 | `lambda doctor` | verifiable installs, CI check |
| 4 | `lambda setup` wizard compiling to `init` flags | the multi-step experience |
| 5 | `--scope user` + user-level settings layer | machine-wide install |
| 6 | opencode target; Homebrew/mise | reach |

Phases 1–3 are each independently shippable and useful without the wizard.

---

## 9. Open questions and risks

- **Env markers are undocumented.** `CLAUDECODE`, `CURSOR_TRACE_ID`, and friends
  are observed, not contracted. They should raise confidence and pre-check a box,
  never write a file without confirmation, and `detect` should label them
  `(heuristic)` in output — as sketched in §2a.
- **Writing under `~` is a different consent level** than writing in the repo the
  user is standing in. User scope should always require an explicit
  `--scope user`, never be inferred from detection.
- **`prepare` runs in consumers' installs.** It requires `typescript` at install
  time from a git URL. Acceptable pre-publish; once published, `files: ["dist"]`
  means the tarball already contains the build and `prepare` is skipped.
- ~~**Version is `0.0.0` in two places**~~ — **fixed**: [cli.ts](../../src/cli.ts)
  now reads `version` from `package.json` via `createRequire`, so `--version`
  cannot drift from the published package.
- **Windows.** `onPath` must respect `PATHEXT`, and the Cursor/Claude config
  paths above are POSIX-shaped. Detection should return `absent` rather than
  guess on an unhandled platform.
