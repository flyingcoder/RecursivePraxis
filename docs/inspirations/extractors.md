# Extractors

## Purpose

Extractors turn a repository of prose and notation into **structured primitives** the compiler can consume: operator symbols and definitions, equations (especially dissipation and composition), and contradictions classified as sterile vs productive (`J'≠0`). They exist so the Controlled Rupture algebra can be grounded in corpus evidence rather than invented by hand—while leaving the commutator *sign* table as ground truth and using extraction only for magnitudes and mapping.

## Overview

The extraction engine is a reusable pipeline: an abstract base that owns I/O, hashing, checkpoints, and thread-pool execution; three concrete extractors; a CLI that wires an LLM client and runs selected extractors over a repo; and an OpenRouter adapter that mimics the Anthropic messages API so the same `ask_claude` path works with either provider.

Each extractor is a two-stage hybrid:

1. **Regex / keyword harvest** over markdown (default glob `*.md`).
2. **LLM interpretation** that returns JSON (name, properties, dissipation flags, J-anomaly scores, operator mappings).

Intended later extractors (constructs/terms, unique signifiers) and a cross-repo merge tool are specified in the engine overview but **not implemented**. Outputs are per-repo JSON blobs meant to feed operator-algebra graphs, proto-dissipation equations, and a J'≠0 catalog.

## Flow

1. **Input.** The CLI receives a repository path plus extractor names (`operator`, `equation`, `contradiction`, or all), optional output directory, worker count, checkpoint interval, API key, provider (`openrouter` default vs `anthropic`), and model id.
2. **Validation.** The repo path must exist. An API key is required (`OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, or `--api-key`). Extractor names must be in the registry. Unknown names abort.
3. **Processing.** For each selected extractor: instantiate with repo, output dir, client, checkpoint/workers; discover markdown files; skip files whose SHA-256 content hash is already in the checkpoint; for remaining files, read UTF-8 (errors ignored), run `extract_from_content`, wrap items in a standard result record, checkpoint every N files, write JSON. LLM calls go through the base helper (Anthropic-shaped `messages.create`). OpenRouter posts to the chat-completions endpoint and wraps the text so `.content[0].text` still works.
4. **Output.** One JSON file per extractor (`operators.json`, `equations.json`, `contradictions.json`) under the output directory (default `<repo>/extraction_outputs`), plus a checkpoint file of processed hashes.

## Key Components

- **CLI runner** — argument parsing, provider/client setup, sequential run of registered extractors, progress banners. Does not merge results across extractors or repos.
- **Extractor registry** — maps the three names to concrete classes; designed to grow.
- **Extractor base** — abstract contract (`extractor_name`, `extract_from_content`, `prompt_template`), file discovery, hash skip, parallel `process_all`, checkpoint load/save, result serialization, `ask_claude`.
- **Extraction result record** — `source_file` (relative), `source_hash`, `timestamp`, `data` (`items` + `count`), `extraction_type`, `confidence`, optional `metadata`.
- **OpenRouter client** — drop-in `messages.create`; uses the client’s configured model (the `model` argument on `create` is ignored in favor of constructor state).
- **Operator extractor** — scans a fixed Unicode symbol list (Greek, calculus, tensor, logic, and rupture glyphs such as ⟲ ↑ ↓ ↶ ↷ ⊥ ∥). For each symbol present, takes the longest context windows and asks the model for name, definition, algebraic properties, and compositions.
- **Equation extractor** — harvests inline `` ` ` `` / `$ $`, fenced math/latex blocks, and lines containing `= → ≈ ⇒ ↔`; keeps strings that include math symbols and length > 5; caps at 50 equations per file; asks the model for type, differential order, operators, dissipation evidence, commutativity, rupture-operator mapping, hidden structure.
- **Contradiction extractor** — keyword windows (~300 chars around paradox/contradiction language) plus a crude “Term is/equals Def” conflict finder; each candidate is classified as actual contradiction or not, type, sterile vs productive, J-anomaly in `[0, 1]`, generative outputs, operator pattern; deduped by first 100 characters of snippet. Caps 10 matches per keyword.

## Data / State

**Checkpoint:** `{ processed_hashes: [...], timestamp }` keyed by extractor name.

**Output envelope:**

```json
{
  "metadata": {
    "repo_path": "...",
    "total_files_processed": 0,
    "extraction_type": "operator|equation|contradiction",
    "timestamp": "..."
  },
  "results": [ { "source_file", "source_hash", "timestamp", "data": { "items": [...], "count": N }, "extraction_type", "confidence" } ]
}
```

**Operator item (typical):** `symbol`, `name`, `definition`, `contexts`, `occurrences`, `algebraic_properties`, `compositions`.

**Equation item (typical):** `equation`, `type`, `order`, `operators`, `has_dissipation`, `dissipation_evidence`, `is_commutative`, `controlled_rupture_ops`, `hidden_structure`, `interpretation`, plus `raw_equation` and `source_file`.

**Contradiction item (typical):** `has_contradiction`, `contradiction_type`, `is_productive`, `j_anomaly_score`, `explanation`, `generative_output`, `operator_pattern`, `context_snippet`, `source_file`, `trigger_keyword`, optional `conflict_term`.

**LLM contract:** prompts demand a single JSON object; parsers take the first `{...}` via greedy regex. Failed parse or API error yields empty definition / skip.

## Constraints

- Markdown-only by default; other corpora are invisible unless the glob is changed in code.
- Requires a live LLM and a billed/free API key; there is no offline fallback.
- The base helper hardcodes an Anthropic model id on the request; OpenRouter still sends its own constructor model. Provider mismatch can confuse debugging.
- Parallel workers share the same hash set without locking; duplicate processing is possible under race.
- Checkpoints skip **content hashes**, not paths: renamed copies of the same text are skipped; edited files re-run.
- Result JSON is **overwritten** with the current batch’s `results` only (not a merge of prior runs’ items). Re-running after a crash can drop earlier items that were already checkpointed as hashes.
- Per-file and per-keyword caps (50 equations, 10 contradiction windows) systematically miss dense files.
- Definitional-conflict regex is English, capitalized terms, and naive; it is a candidate generator, not a logic engine.
- JSON extraction from model output is brittle if the model emits nested objects or commentary.
- Documented merge CLI and extra extractors do not exist yet; README “`--resume`” is not a distinct flag—resume is implicit via checkpoints.
- Extractor tests are absent (blast-radius: no covering tests for the registry, base class, or concrete extractors).

## Testing

There is **no automated extractor test suite** in this folder. Manual / operational scenarios:

- Missing repo path or missing API key exits with an error.
- Unknown extractor name lists the registry and exits.
- `--all` vs comma-separated names runs the expected subset.
- Interrupt mid-run, restart: already-hashed files skipped; new files processed.
- Operator pass on a short markdown corpus yields JSON with symbols that actually appear in the text.
- Equation pass maps dissipation-like expressions onto rupture operator names.
- Contradiction pass drops `has_contradiction: false` and keeps high J-anomaly productive cases.
- OpenRouter vs Anthropic both return text through the same `.content[0].text` shape.

Recommended future tests: fixture markdown without network (mocked `ask_claude`), checkpoint resume, JSON parse failures, and hash skip.
