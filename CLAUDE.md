# CLAUDE.md

Guidance for Claude Code when working in this repository.

@AGENTS.md

## Project

RecursivePraxis (CLI binary: `lambda`) is a deterministic cognitive-operator kernel and CLI for bounded, replayable agent reasoning. See [CONTRIBUTING.md](CONTRIBUTING.md) for scope, the repository map, and change-review expectations — read it before making non-trivial changes.

## Setup

```sh
npm install
npm run build
npm test
```

Use `npm run test:watch` while iterating.

## Before submitting a change

```sh
npm run build
npm test
git diff --check
```
