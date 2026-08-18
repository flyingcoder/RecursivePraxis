# RecursivePraxis — agent boundary

## Ownership

- **OpenSpec** in store `ai-labs` owns delivery (what to build, change
  artifacts, `/opsx-*` workflows).
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
