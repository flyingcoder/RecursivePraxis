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

## External research: quarry Controlled Rupture CLI

Sequence generation / InverseSolver experiments stay **outside** this
`lambda` binary. Use the quarry CLI directly (research-only; not a
RecursivePraxis subcommand):

```bash
cd ../recursive-ai-framework/recursive-extraction-engine/compiler
python3 controlled_rupture_cli.py diagnose <topic>
python3 controlled_rupture_cli.py list
python3 controlled_rupture_cli.py custom <Op>…
python3 controlled_rupture_cli.py analyze <seq>
```

Do not treat quarry `λ_effective` or cost breakdowns as measured Praxis
scores. Vocabulary hard-checks live on `lambda operators` / `lambda check`.
