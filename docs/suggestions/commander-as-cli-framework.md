# Suggestion — Commander as the CLI framework

Status: suggestion. See [NOTICE.md](NOTICE.md).

**Recommendation: yes, but pin `commander@14`, and adopt it as a *dispatch and
validation* layer only — not as an application framework.** The parsing layer in
`src/cli.ts` is hand-rolled, silently lossy, and is the third of three
uncoordinated copies of the command surface. Commander removes the parser and
collapses two of the three copies. It does not touch the kernel, the wizard, or
the host adapters, and it should not be allowed to.

Everything below was measured against this checkout, not assumed. Reproduction
transcripts are in §2.

---

## 0. The version pin is not incidental

`npm view commander version` reports **15.0.0**, whose `engines` field is
`node >= 22.12.0`. This package declares `"engines": { "node": ">=20" }`.

Adopting `commander@15` silently raises the floor for every installed user by
two major Node versions. **Pin `commander@14.0.3`** (`engines: node >= 20`),
which matches the declared floor exactly. Revisit only when this package
independently decides to drop Node 20.

Commander has zero runtime dependencies, so the install-surface argument against
it is weak — it adds one package, not a tree.

---

## 1. What is actually there now

| Fact | Measurement |
| --- | --- |
| `src/cli.ts` | 569 lines, the second-largest file in `src/` |
| `printHelp()` | one ~100-line hand-maintained string array |
| Hand-rolled flag extractors | `extractHostFlag`, `extractJsonFlag` in `cli.ts`; a private `extractFlags` in each of `sense.ts`, `solve.ts`, `compile.ts`; `extractValueFlags` in `cli-commands/init.ts` |
| Hand-written `usage:` strings | 15, across 6 files |
| Dispatch | 24 sequential `if (first === "…")` blocks |
| Third copy of the surface | [docs/CLI_REFERENCE.md](../CLI_REFERENCE.md), 9.7 KB, maintained by hand |

The command surface is therefore stated in three places that no build step
compares: `printHelp()`, the per-command `usage:` strings, and `CLI_REFERENCE.md`.
Nothing fails when they disagree.

A fourth consumer exists and is the reason this matters more here than in a
typical CLI: `src/init/workflows.ts` renders `lambda …` invocations into the
skill and command files installed into Claude Code, Cursor, Codex, and opencode.
When the surface drifts, it drifts into generated agent instructions.

---

## 2. Four defects, reproduced

All four were run against `dist/cli.js` in a scratch cwd.

### 2.1 A mistyped `--json` silently returns prose, exit 0

```
$ lambda status --jsonn
attractor: J=0  (V=0.000)
state: D=0.000 C=0.000
lambda_eff: 0.000 (low)
$ echo $?
0
```

`extractJsonFlag` filters for the exact string `--json` and **discards the
remainder without inspecting it**. A caller that pipes this into `jq` gets a
parse error with no indication of which side was wrong. For a CLI whose stated
purpose is to be a deterministic, machine-readable oracle for host agents, an
ignored output-format flag is the worst available failure mode.

### 2.2 Unknown flags mutate state and report success

```
$ lambda sense --d 0.5 --c 0.4 --bogus
sensed: D=0.500 C=0.400 -> attractor S*
```

`--bogus` is not rejected — the session file is written and exit is 0.

### 2.3 `--flag=value` works in `init`, fails everywhere else

```
$ lambda solve --initial=0.9,0.1 --target=0.2,0.8
usage: lambda solve --initial D,C --target D,C [--beam-width N]
```

`extractValueFlags` in `init.ts` handles both `--flag value` and `--flag=value`.
The extractors in `sense.ts`, `solve.ts`, and `compile.ts` handle only the first
form. Same CLI, two conventions, no documentation of the split.

### 2.4 A value flag missing its value reports the wrong error

```
$ lambda run --host
usage: lambda run <task>
```

`extractHostFlag` consumes `--host`, reads `undefined` as its value, and drops
both. The user is then told their *task* is missing.

### 2.5 Also worth noting

- `lambda --json status` → `unknown command: --json`. Global-looking flags are
  only accepted after the subcommand, which is undocumented.
- `lambda` with no arguments prints help and exits **0**. Commander's default for
  this shape is help-to-stderr and exit 1; preserving 0 requires one explicit
  line (§7).

None of these are parser bugs to be fixed in place. They are the predictable
output of writing five ad-hoc parsers, and the fifth one will have them too.

---

## 3. What Commander fixes — and what it does not

**Fixes, without new code:** unknown-flag rejection, missing-value errors,
uniform `--flag=value`, `-h`/`--help` per subcommand, help text generated from
the same declarations that do the parsing, `unknown command` handling, and
suggestion-on-typo.

**Does not fix, and must not be expected to:**

- `docs/CLI_REFERENCE.md` still drifts unless a script generates it (§8, phase 4).
- The `init` wizard. `InitWizard`, `WizardIO`, `NeedsFlagError`, and the TTY /
  pre-answered / flag-only IO split are a genuinely good design that Commander
  has no opinion about. Commander parses the flags and hands them over; the
  wizard is unchanged.
- Domain validation. `parseConfigFlags`, `isScope`, `parseOperator`,
  `parseDCPair` stay exactly where they are (§6 explains why this is mandatory,
  not merely preferred).
- Anything below `src/cli-commands/`. The kernel, engine, hosts, manifest, and
  render layers do not learn that Commander exists.

**"Main framework" is the wrong frame.** Commander should own `argv → validated
options → existing `run*` function` and nothing else. The moment a `Command`
object is imported outside `src/cli.ts` and `src/cli-commands/`, the refactor has
overreached.

---

## 4. Target shape

`src/cli.ts` becomes a registration file. Each `run*` function keeps its current
signature, so `src/cli-commands/*.ts` changes only by deleting its private
`extractFlags`.

```ts
import { Command, Option, InvalidArgumentError } from "commander";

/** A factory, not a shared instance — Commander Options are per-command. */
const jsonOption = () =>
  new Option("--json", "emit the machine-readable payload instead of prose");

const program = new Command()
  .name("lambda")
  .description("RecursivePraxis CLI")
  .version(VERSION, "-v, --version")
  .showHelpAfterError();

program
  .command("status")
  .description("attractor, V, D/C, λ_eff, mode, legalNext for the current session")
  .addOption(jsonOption())
  .action(async (opts) => runStatus(SESSION_BASE_DIR, opts.json === true));
```

Validation moves into the option declaration, so the check happens once and the
error text is owned by one line:

```ts
const unitInterval = (label: string) => (raw: string): number => {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new InvalidArgumentError(`--${label} must be a number in [0, 1], got "${raw}"`);
  }
  return value;
};

program
  .command("sense")
  .description("set the session's D/C state directly")
  .option("--d <n>", "dissipation in [0,1]", unitInterval("d"))
  .option("--c <n>", "coherence in [0,1]", unitInterval("c"))
  .addOption(new Option("--from <file>", "read {D,C} from a JSON file").conflicts(["d", "c"]))
  .addOption(jsonOption())
  .action(async (opts) => { /* one remaining check: --from, or both --d and --c */ });
```

Variadic task arguments, which `taskFrom` currently reassembles by hand:

```ts
program
  .command("plan")
  .description("build a deterministic, budgeted operator plan")
  .argument("<task...>", "the objective")
  .action((task: string[]) => runPlan(task.join(" ")));
```

The reserved verbs stay load-bearing. `tests/fail-closed.test.ts` asserts that
each module throws its own refusal, so they must keep dispatching *through* the
module rather than matching a string:

```ts
for (const [verb, refuse] of Object.entries(RESERVED_VERBS)) {
  program
    .command(verb)
    .description("— not implemented")
    .action(() => { refuse(); });  // throws; the top-level catch exits 1
}
```

`sync` keeps its alias rather than a second `if`:

```ts
program.command("sync").alias("update") /* … */;
```

Nested `operators list` / `operators show` becomes a subcommand of a subcommand,
which is the shape it already has semantically:

```ts
const operators = program.command("operators").description("the operator alphabet");
operators.command("list").action(…);
operators.command("show").argument("<Op>").action(…);
```

---

## 5. The one real design decision: where `--json` lives

Today `--json` is stripped from *anywhere* in the argument list by
`extractJsonFlag`, then passed down as a boolean. Commander offers two options:

| Option | Consequence |
| --- | --- |
| **Declare `--json` on each subcommand** (recommended) | `lambda status --json` keeps working; `--json` appears in each subcommand's `--help`; a subcommand that has no JSON payload cannot accept it |
| Declare it once on `program` | `lambda --json status` becomes the only accepted form — **this breaks every documented invocation and every generated skill file** in `src/init/workflows.ts` |

Take the first. The `jsonOption()` factory keeps it one declaration in source
even though it is registered 14 times. The 100-line `printHelp()` array is the
cost being removed here; 14 `.addOption(jsonOption())` calls is a cheap trade.

---

## 6. Compatibility with the existing black-box tests

This is the strongest argument for doing the refactor at all: **`lambda` is
already tested as a subprocess.** `tests/cli.test.ts`, `tests/fail-closed.test.ts`,
`tests/install-commands.test.ts`, and `tests/init.test.ts` all `spawnSync` on
`dist/cli.js` and assert on stdout/stderr/exit code. A parser swap is verifiable
by the suite that already exists.

Assertions the migration must not break, each checked against Commander's
defaults:

| Test | Assertion | Under Commander |
| --- | --- | --- |
| `fail-closed` | `/unknown command/i` on `lambda sequence` | ✅ default is `error: unknown command 'sequence'` |
| `fail-closed` | help matches `` `record.*not implemented` `` | ✅ if the description is `— not implemented` (one line per command) |
| `fail-closed` | help names `status sense step analyze solve diagnose halira bind ir` | ✅ generated command list |
| `cli` | `--version` prints `\d+\.\d+\.\d+`, exit 0 | ✅ via `.version(VERSION, "-v, --version")` |
| `cli` | `--help` exit 0 | ✅ Commander exits 0 for explicit `--help` |
| `cli` | `plan Fix the parser` byte-identical across runs | ✅ variadic argument, same join |
| `init` | stderr matches `/unknown host: gpt/` | ⚠️ **only if `--host` does not use `.choices()`** |
| `install-commands` | stderr matches `/unknown scope: machine/` | ⚠️ **only if `--scope` does not use `.choices()`** |

The two ⚠️ rows are the trap. Commander's `.choices()` is attractive and would
emit `option '--host <id>' argument 'gpt' is invalid. Allowed choices are …`,
breaking both tests and changing the message that `lambda init` shows users.

**Leave `--host` and `--scope` as plain `<value>` options and keep validation in
`parseConfigFlags` and `isScope`.** Those functions are the single definition of
a legal value and are unit-tested directly (`tests/config.test.ts:301`). Moving
validation into the parser layer would fork it.

---

## 7. Behavior that will change

Accept these three deliberately, or handle them explicitly:

1. **No-argument exit code.** Currently `lambda` prints help and exits 0.
   Commander's default for a subcommand-only program is help-to-stderr, exit 1.
   Preserve the current behavior with an explicit guard before `parseAsync`:
   ```ts
   if (process.argv.length === 2) { program.outputHelp(); process.exit(0); }
   ```
2. **Error message prefix.** Parser errors gain Commander's `error: ` prefix.
   Domain errors from the `run*` functions are unaffected. No current test
   asserts an unprefixed parser error, but `install.sh` / `install.ps1` should be
   grepped before merge.
3. **Previously-ignored input now fails.** `--jsonn`, `--bogus`, and trailing
   `--host` become exit-1 errors. This is the point of the change, but it is a
   breaking change for any script that was relying on the silence.

---

## 8. Migration in four phases

Each phase is independently shippable and leaves the suite green.

**Phase 1 — scaffold (no behavior change).** Add `commander@14.0.3`. Build the
`program` with every subcommand registered, each action calling the existing
`run*` function with arguments assembled exactly as today. Delete `printHelp()`,
`extractJsonFlag`, `extractHostFlag`, and the 24-branch `main`. Run the existing
suite; fix only the help-text assertions. Expected: `src/cli.ts` drops from 569
lines to roughly 250.

**Phase 2 — push parsing down.** Delete the private `extractFlags` from
`sense.ts`, `solve.ts`, and `compile.ts`, and `extractValueFlags` from
`init.ts`. Change each `run*` signature from `(rest: string[], …)` to a typed
options object. `parseOperator`, `parseOperatorSequence`, and `parseDCPair` in
`cli-support/parse.ts` become Commander argument parsers unchanged — they already
throw on bad input, which is the exact contract `InvalidArgumentError` wants.

**Phase 3 — delete the usage strings.** All 15 `usage: lambda …` strings become
Commander descriptions. `CONFIG_FLAG_USAGE` and `TOOLS_FLAG_USAGE` are the two
that carry real information; port their content into option descriptions rather
than dropping it.

**Phase 4 — generate the reference.** Add a script that walks the command tree
and emits `docs/CLI_REFERENCE.md`, plus a CI check that fails when the committed
file differs. This is the phase that actually retires the drift, and it is only
possible once phases 1–3 make the command tree introspectable.

Phases 1 and 4 carry most of the value. Phase 2 is the largest diff and the
lowest risk, since it is mechanical and covered by subprocess tests.

---

## 9. The case against

Stated fairly, because the repo's own conventions favor hand-rolled determinism:

- **A dependency in the trust path.** `lambda` is installed by `install.sh` and
  invoked by four host agents. Commander is zero-dependency, MIT, and one of the
  most-audited packages on npm, but it is still one more thing between `argv` and
  the kernel. Mitigation: it never touches anything below `src/cli-commands/`.
- **The determinism argument does not apply.** The kernel's determinism is a
  property of `src/kernel/` and `src/engine/`, not of argument parsing.
  Commander's parse is itself deterministic; `tests/cli.test.ts` asserting
  byte-identical `plan` output across runs continues to hold.
- **Generated agent instructions could drift from the parser.** Real risk, and it
  exists today. Phase 4 is what closes it; without phase 4, this refactor
  improves the CLI's ergonomics and leaves `workflows.ts` exactly as exposed as
  it is now.
- **It is not free.** Phases 1–3 touch ~20 files. The honest justification is not
  "Commander is better" but the four reproduced defects in §2, all of which are
  in the class of *silently wrong output to a machine consumer*.

---

## 10. What stays hand-rolled

Explicitly out of scope, to prevent the refactor from sprawling:

- `InitWizard` and the entire `src/init/` step machine.
- `WizardIO` and its TTY / flag / pre-answered implementations, including
  `NeedsFlagError` — Commander has no non-TTY prompt story worth adopting.
- `Settings`, `parseConfigFlags`, `isScope` — the definition of a legal value.
- The `RESERVED_VERBS` dispatch-through-module pattern, which is load-bearing for
  `tests/fail-closed.test.ts` and must survive verbatim.
- Every module under `src/kernel/`, `src/engine/`, `src/hosts/`, `src/ir/`,
  `src/manifest/`, and `src/render/`.

No companion package (`inquirer`, `chalk`, `ora`) is proposed. Commander alone,
pinned at 14, dispatch and validation only.
