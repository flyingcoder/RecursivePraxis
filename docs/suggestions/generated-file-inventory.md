# Suggestion — the generated file inventory of `lambda init`

Status: suggestion. See [NOTICE.md](NOTICE.md). This document is scoped to one
question the installation architecture
([../INSTALL_ARCHITECTURE.md](../INSTALL_ARCHITECTURE.md))
answers only in passing: **what, exactly, does `lambda init` leave on a
machine, and how does a human find that out without running it?**

It proposes no change to what is written. Every path, every byte, and every
file in this document already exists in this checkout. What is proposed is that
the inventory become a *named artifact* — something the CLI can print, `doctor`
can break down, and a reviewer can read before approving the command — rather
than something reconstructible only by running `init` and reading a list of
paths.

Every figure below was captured from a real run of `lambda init --tools cursor`
in an empty scratch directory, and every one of them is reproducible by
repeating that run — see [§4](#4-reproducing-the-capture) for the exact
sequence.

---

## 0. What `init` writes today (verified by running it in this checkout)

Captured from `lambda init --tools cursor --scope project` at `lambda 0.2.0`
in an empty directory.

### 0.1 The inventory, for one host

Seven workflows ([workflows.ts](../../src/init/workflows.ts)) × two file
surfaces (Cursor has both skills and commands) = **14 files, 40,279 bytes**,
plus one install record.

| File | Role | Bytes | Lines |
| --- | --- | ---: | ---: |
| `.cursor/skills/recursive-praxis-status/SKILL.md` | skill | 2,482 | 41 |
| `.cursor/commands/praxis-status.md` | command | 2,452 | 40 |
| `.cursor/skills/recursive-praxis-analyze/SKILL.md` | skill | 2,427 | 40 |
| `.cursor/commands/praxis-analyze.md` | command | 2,396 | 39 |
| `.cursor/skills/recursive-praxis-solve/SKILL.md` | skill | 2,434 | 42 |
| `.cursor/commands/praxis-solve.md` | command | 2,405 | 41 |
| `.cursor/skills/recursive-praxis-diagnose/SKILL.md` | skill | 2,444 | 46 |
| `.cursor/commands/praxis-diagnose.md` | command | 2,412 | 45 |
| `.cursor/skills/recursive-praxis-intent/SKILL.md` | skill | 5,075 | 88 |
| `.cursor/commands/praxis-intent.md` | command | 5,045 | 87 |
| `.cursor/skills/recursive-praxis-session/SKILL.md` | skill | 3,267 | 61 |
| `.cursor/commands/praxis-session.md` | command | 3,236 | 60 |
| `.cursor/skills/recursive-praxis-ir/SKILL.md` | skill | 2,115 | 34 |
| `.cursor/commands/praxis-ir.md` | command | 2,089 | 33 |
| `.recursive-praxis/install.json` | install record | 2,869 | — |

The skill and command files for a given workflow differ by **exactly one
line**: the skill carries `name:` in its frontmatter and the command does not
([remark-praxis-frontmatter.ts](../../src/render/plugins/remark-praxis-frontmatter.ts)).
Verified by `diff` across all seven pairs.

### 0.2 Five kinds of file, three ownership rules

The 14 markdown files are not one thing, and the difference matters more than
the count does:

| Kind | Emitted by | Ownership | Removal |
| --- | --- | --- | --- |
| **skill** | every host with a skill surface | tool owns everything through `MANAGED:END`; the human owns everything after it | `lambda uninstall` |
| **command** | every host with a command surface | same | `lambda uninstall` |
| **package manifest** (`plugin.json`) | Claude Code global scope only ([PluginLayout](../../src/hosts/layouts.ts)) | tool owns the whole file — no markers, matched on content | `lambda uninstall` |
| **install record** (`install.json`) | always | tool owns entirely | `lambda uninstall` |
| **runtime config** (`config.json`) | only when a config flag is passed | human owns; `init` never rewrites it unasked | never removed by `uninstall` |

The ownership boundary is `ownedHead()`
([managed-block.ts](../../src/render/managed-block.ts)) — the start of the file
through `MANAGED:END`, frontmatter included. That is what `install.json` hashes
and what `sync` overwrites. Content after the end marker is excluded on
purpose: a user appending a section is keeping a promise the tool made them,
not causing drift.

Demonstrated end to end by appending a `## Team note` section below the end
marker and re-running `init`: the appended section survives untouched, and the
file still reports `preserved`.

### 0.3 Scope changes the root, not the bytes

`lambda init --tools cursor --scope global` writes the same 14 files under
`~/.cursor/` instead of `./.cursor/`, and puts the record at
`~/.recursive-praxis-cli/install.json` instead of
`./.recursive-praxis/install.json`.

The file contents are **byte-identical across scopes** for Cursor — verified by
`diff -r`, and independently by the project- and global-scope `install.json`
records carrying the same fourteen SHA-256 digests. Cursor's
invocation (`/praxis-<id>`) does not vary by scope, so the invocation transform
has nothing to change. This does **not** generalise: Claude Code's global scope
is a plugin namespace (`/recursive-praxis:<id>`) and its bytes do differ.

### 0.4 The four write outcomes

`FileWriter` ([write.ts](../../src/init/write.ts)) reports one of four actions
per file, and cannot clobber:

| Action | When | Observed in |
| --- | --- | --- |
| `created` | no file at that path | the first `init` run |
| `preserved` | our file, managed region already identical | the second `init` run |
| `refreshed` | our file, managed region differs | — |
| `skipped` | a file exists with no managed markers — left untouched | — |

`skipped` is the reason `init` needs no dry-run or confirmation prompt: the
destructive outcome a preview would protect against does not exist.

---

## 1. What is missing, concretely

Five gaps, each verifiable by re-running the commands named below.

1. **The output tells you paths, not roles.** A first `lambda init --tools cursor`
   prints fourteen paths under `created:`. Nothing says that seven of them are
   skills and seven are commands, that they pair up per workflow, or that each
   one has a user-owned tail. A reader has to infer the model from the
   directory names.

2. **`--json` drops the two fields that would fix that.** `PlannedFile` carries
   `kind` and `workflowId` ([HostAdapter.ts](../../src/hosts/HostAdapter.ts));
   `FileWriteResult` ([write.ts](../../src/init/write.ts)) does not, so both are
   discarded before the JSON is printed. In the payload from
   `lambda init --tools cursor --json`, every entry is
   `hostId` / `relPath` / `displayPath` / `absPath` / `action`. A machine reader
   cannot distinguish a skill from a command from a `plugin.json` without
   re-parsing the path.

3. **`doctor` reports one number.** `lambda doctor` prints `files 14 managed`,
   counting by *status*, never by
   *kind*. Fourteen managed files and fourteen managed skills read identically.

4. **There is no way to see the inventory without writing it.** That is a
   deliberate choice for safety (§0.4) and it is the right one — but "this
   cannot clobber" and "I want to know what lands on my disk before I run it"
   are different questions, and only the first is currently answered. Reviewing
   the second today means running `init` in a scratch directory, which is
   exactly what produced this document.

5. **Cost is invisible.** 40 KB of prose in fourteen files is a real footprint
   in a repository, and for a host that auto-loads skills it is also a
   per-session context cost. Neither the summary nor `doctor` names a byte
   count or a file count per kind.

None of these is a correctness bug. All five are the same shape: the inventory
exists as data inside `plan()` and is flattened to paths before anyone sees it.

---

## 2. Proposal

Four changes, in dependency order. The first is a precondition for the rest and
is roughly a dozen lines.

### 2.1 Stop discarding `kind` and `workflowId`

`FileWriteResult` should carry the two fields `PlannedFile` already has.
`FileWriter.write()` receives the `PlannedFile`; it copies four of its fields
and drops these two. Nothing else changes, and both the human summary and the
`--json` payload gain the vocabulary they lack.

```ts
export interface FileWriteResult {
  readonly hostId: string;
  readonly kind: FileKind;                  // new
  readonly workflowId: string | undefined;  // new
  readonly relPath: string;
  readonly displayPath: string;
  readonly absPath: string;
  readonly action: FileAction;
}
```

### 2.2 Group the human summary by workflow, and total it

Today the summary is one flat list per action. Grouping by workflow makes the
pairing structural instead of inferred, and one total line answers §1.5:

```
created — 7 workflows, 14 files, 39.3 KiB:

  status      .cursor/skills/recursive-praxis-status/SKILL.md   skill     2.4 KiB
              .cursor/commands/praxis-status.md                 command   2.4 KiB
  analyze     .cursor/skills/recursive-praxis-analyze/SKILL.md  skill     2.4 KiB
              .cursor/commands/praxis-analyze.md                command   2.3 KiB
  …
  ---------------------------------------------------------------------------
  plus        .recursive-praxis/install.json                    record    2.8 KiB
```

The `Invoke with:` block and the `Same result without prompts:` line stay
exactly as they are — both already work.

### 2.3 `lambda init --inventory` — print the plan, write nothing

`HostAdapter.plan()` is already pure: it returns every file with its content
and touches no filesystem. `GenerateStep` is the only thing that hands the
result to `FileWriter`. An `--inventory` flag that runs steps 1–3 of the wizard
and then prints the plan instead of writing it is a branch in one method.

```
lambda init --tools cursor --scope project --inventory
lambda init --tools cursor --scope project --inventory --json
```

This is deliberately **not** framed as a dry-run or a confirmation prompt. §0.4
still holds — `init` cannot clobber, and adding a confirmation step would be
ceremony over an operation that is already safe. `--inventory` answers a
different question: *what is the footprint*, asked by someone who has not
decided to run `init` at all, and asked in CI or in a review comment where
writing to a scratch directory is not available.

Note that `lambda plan` is taken — it builds an operator plan
([cli.ts](../../src/cli.ts)) — so the surface must be a flag on `init`, or a
distinct verb such as `lambda files`. A second meaning for `plan` would be a
real collision, not a near-miss.

### 2.4 Break down `doctor`'s file line by kind

`InstallInspection` ([inspect.ts](../../src/manifest/inspect.ts)) already holds
every `FileFinding` with its `ManifestFileEntry`, and `kind` is on that entry.
The count is one `reduce` away:

```
files        14 managed  (7 skill · 7 command)   39.3 KiB
```

Drifted, missing, orphaned, and foreign counts keep their current shape — those
are status facts and are correct as they stand.

---

## 3. What the inventory must not claim

Three limits, so the artifact does not become a place where unverified
statements accumulate:

- **It is not a capability list.** Fourteen files on disk means fourteen files
  on disk. It does not mean the host loaded them, matched them, or will invoke
  them. Whether Cursor surfaces a skill is Cursor's decision, and
  `verifiedAgainst` on the adapter (`"Cursor skills + commands, 2026-08"`) is
  the honest scope of what we checked.
- **Byte counts are not context costs.** A 2.4 KiB skill file is not 2.4 KiB of
  context; tokenisation, host-side truncation, and lazy loading all sit in
  between. Report bytes, which are a fact, and do not convert them to tokens,
  which would be a guess.
- **`preserved` is a hash result, not an approval.** It means the managed head
  matched the digest in `install.json`. It says nothing about whether the
  content is still correct for the host's current release.

---

## 4. Reproducing the capture

Every figure above comes from one host at one version. To reproduce them, run
this in an empty scratch directory at `lambda 0.2.0`:

```
lambda init --tools cursor --scope project   # 14 created, plus the install record
lambda init --tools cursor --scope project   # 14 preserved — §0.4
lambda init --tools cursor --json            # the payload behind gap 2 in §1
lambda doctor                                # the one number behind gap 3 in §1
lambda uninstall                             # removes exactly the recorded files
```

The first run leaves the shape §0.1 tabulates:

```
.cursor/
├── commands/praxis-<id>.md                7 command files
└── skills/recursive-praxis-<id>/SKILL.md  7 skill files
.recursive-praxis/install.json             project-scope install record
```

Repeating it with `--scope global` writes the same 14 files under `~/.cursor/`
and records them at `~/.recursive-praxis-cli/install.json` — the same fourteen
digests under a different root (§0.3). To see the ownership boundary of §0.2,
append a section below `MANAGED:END` in any generated file before the second
run.

Cursor was chosen because it is the only host that exercises **both** file
surfaces at **both** scopes with no per-scope divergence — which makes it the
clean baseline the other three can be read against. Claude Code adds a package
manifest and a namespace change at global scope, Codex has skills only, and
opencode has commands only; each is a documented deviation from this shape
rather than a fifth shape to learn.

---

## Open questions

1. Should `--inventory` render content hashes? It would let a reviewer diff a
   proposed install against an existing `install.json` without writing
   anything. It also makes the output substantially longer, and the digests are
   only meaningful to someone who already has a manifest to compare against.
2. Is a per-kind byte total worth carrying in `install.json`, or should it stay
   derived? Storing it makes `doctor` cheaper and adds a field that can go
   stale; deriving it costs a stat per recorded file.
3. §2.2's grouped summary is longer than today's flat list — fourteen files
   become seven groups of two plus a total. For a host with one surface
   (opencode, Codex) the grouping adds a level of indentation and no
   information. Group only when the host emits more than one file per workflow?
4. Should `--inventory` refuse to run when an `install.json` already exists,
   and point at `lambda doctor` instead? The two answer adjacent questions, and
   a reader arriving at the wrong one gets a plausible, misleading answer.
