# Vocabulary

This engine implements a formalism specified elsewhere — see
[docs/inspirations/](inspirations/). Porting that specification to TypeScript
required renaming some of its terms. This file records those decisions so a
reader comparing the specification against the code can tell an **intentional
mapping** from a **defect**.

Source-of-truth documents:

- [20-controlled-rupture-operators.md](inspirations/20-controlled-rupture-operators.md) — the precise operator/algebra spec
- [compiler.md](inspirations/compiler.md) — the Python compiler this kernel is ported from
- [original-lambda-engine.md](inspirations/original-lambda-engine.md) — the upstream Cursor-rules README

## Term mappings

| Spec term | Code identifier | Defined in | Note |
|---|---|---|---|
| `λ` | `lambda*` (`lambdaIntrinsic`, `lambdaPairwise`, `lambdaEffective`) | [dissipation.ts](../src/kernel/dissipation.ts) | ASCII transliteration; values are unchanged |
| `∅` (collapse attractor) | `"∅"` in `AttractorLabel` | [types.ts](../src/kernel/types.ts) | Aligned to the glyph as of trace schema **1.2.0**. Schema 1.1.0 recorded it as the ASCII string `"void"` — see below |
| `J=0`, `S*` | `"J=0"`, `"S*"` | [types.ts](../src/kernel/types.ts) | Carried over verbatim |
| `inverse_solver` / `InverseSolver` | `solve()`, `solver.ts` | [solver.ts](../src/kernel/solver.ts) | "inverse" is dropped; behaviour is the ported beam search |
| hand-set effect / extraction-refined magnitude | `"authored"` / `"measured"` / `"inferred"` (`Provenance`) | [core.ts](../src/engine/core.ts) | This engine only ever produces `authored` values; extraction is out of scope |
| Mode 1 — "Duality Navigation" | `session.mode === 1` | [types.ts](../src/kernel/types.ts) | The prose mode *name* is not an identifier anywhere |
| Mode 2 — "HALIRA Protocol" | `session.mode === 2` | [types.ts](../src/kernel/types.ts) | The seven HALIRA **step names** *are* preserved verbatim in [halira.ts](../src/kernel/halira.ts) |
| operator names, classes, `meaning` | identical strings | [formalism.json](../src/assets/formalism.json) | No renaming; these are the load-bearing vocabulary |

## Operator glyphs

Every operator carries the specification's Unicode glyph. It is **display-only** —
the canonical identifier throughout this engine is the operator *name*.

```sh
lambda operators list        # ↑  Ana, ↓  Kata, ⟲  Meta, …
lambda operators show Vale
```

Read programmatically via `operatorSymbol(op)` from [formalism.ts](../src/kernel/formalism.ts).

### Known ambiguity: the `∅` collision

`Vale`'s glyph is `∅` — the *same character* the phase portrait uses for the
collapse attractor. This collision exists in the upstream formalism, not in this
port, so it is pinned by a test rather than "fixed":

- attractor `∅` → a region of phase space (`classifyAttractor`)
- operator `Vale` (`∅`) → a member of the twenty-operator alphabet

Disambiguate by position: an attractor label never appears in an operator
sequence, and vice versa.

## Trace schema and the `void` → `∅` change

Trace schema **1.2.0** records the collapse attractor as `"∅"`. Traces written
under **1.1.0** recorded `"void"`.

`verifyReplay` accepts **both** schema versions. A 1.1.0 trace is normalized for
comparison only and is never rewritten, so its recorded `traceHash` — computed
over the original `"void"` body — stays verifiable. See `LEGACY_VOID_ATTRACTOR`
and `normalizeAttractor` in [orchestrator.ts](../src/engine/orchestrator.ts).

## Retired term: `CORE`

`CORE` (as in "the CORE alphabet", "CORE Step 3/5") appeared throughout the
source but was **defined in no document** in this repository or its history. It
read as a predecessor name for the system itself. It was removed on 2026-08-21
in favour of terms this repository actually defines:

| Retired | Replacement |
|---|---|
| "CORE alphabet" / "CORE Step 3 alphabet" | "operator alphabet" |
| "CORE Step 5" | "sequence grammar (hard constraints)" |
| "canonical CORE spellings" | "canonical operator spellings" |
| "the CORE addition" | "the RecursivePraxis addition" |
| "the CORE reasoning alphabet" (model prompts) | "the RecursivePraxis operator alphabet" |

## Upstream inconsistencies

The copied JSON assets contain internal contradictions inherited from upstream.
They are documented — not silently corrected — in
[src/assets/NOTICE.md](../src/assets/NOTICE.md).
