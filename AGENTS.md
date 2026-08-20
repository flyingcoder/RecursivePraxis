# RecursivePraxis — agent boundary

Parent folder `ai-labs/` is the **build workspace** (OpenSpec + Λ-Engine CORE).
This repo is the **product**. `lambda` must run with OpenSpec and
`recursive-ai-framework/` absent. Do not read workspace-root `AGENTS.md` as
product runtime requirements. Workspace rule:
`../.cursor/rules/workspace-vs-recursivepraxis.mdc`.

## Ownership

- **OpenSpec** in store `ai-labs` owns *workspace* delivery (what to build,
  change artifacts, `/opsx-*` workflows). It is not a RecursivePraxis
  runtime dependency.
- **RecursivePraxis** owns cognition (how `lambda` reasons: record →
  validate → score → revise). Do not treat this repo as a second delivery
  system.

## Forbidden

- Do **not** write into `recursive-ai-framework/` (the quarry is read-only).
- Do **not** make `lambda` a delivery system (no OpenSpec home here, no
  `/opsx-*` workflows under this tree, no replacement for store `ai-labs`).

## Install / build

```bash
npm install
npm run build
npx lambda --help
```

## Reserved modules

`src/record`, `src/validate`, `src/score`, and `src/revise` are **location
reservations only**. Their presence does not resolve observer-vs-runtime
or any other Problem Model unknown. They must not score, revise constants,
or pretend measurement until a later change owns that behavior.

## Dissipation kernel: ported from real-lambda-engine

`src/kernel/` is a trusted, first-party port of the sibling repo
`ai-labs/real-lambda-engine` (deterministic dissipation-state solver, HALIRA
mode-2 escalation, session `bind()` lifecycle — ported verbatim, source
project version `0.1.0` at port time). It backs `lambda plan` / `lambda
run`'s sequencing and the `lambda status|sense|step|analyze|solve|diagnose
|halira|bind|ir` subcommands. Its λ values are authored, not measured — the
same status as every other authored constant in this repo — but they are now
load-bearing and its output is trusted first-party surface, not
research-only. This is a deliberate, explicit exception to the boundary
below: real-lambda-engine is a TypeScript sibling under this workspace's
direct authorship, not the external Python quarry the boundary was written
for.

## External research: quarry Controlled Rupture CLI

The Python quarry CLI stays **outside** this `lambda` binary and remains
unabsorbed — the boundary below still applies to it specifically (it does
*not* apply to real-lambda-engine above). Use the quarry CLI directly
(research-only; not a RecursivePraxis subcommand):

```bash
cd ../recursive-ai-framework/recursive-extraction-engine/compiler
python3 controlled_rupture_cli.py diagnose <topic>
python3 controlled_rupture_cli.py list
python3 controlled_rupture_cli.py custom <Op>…
python3 controlled_rupture_cli.py analyze <seq>
```

Do not treat quarry `λ_effective` or cost breakdowns as measured Praxis
scores, and do not conflate quarry output with this binary's own
`lambda analyze` / `lambda status` (a distinct, first-party, trusted
surface as of the real-lambda-engine port — see above). Vocabulary hard
grammar checks live on `lambda operators` / `lambda check`.
