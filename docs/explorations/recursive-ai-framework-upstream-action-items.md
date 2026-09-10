# Suggested action items: Recursive AI Framework upstream relationship

This document turns the recommendations in
[`recursive-ai-framework-upstream-contribution-analysis.md`](./recursive-ai-framework-upstream-contribution-analysis.md)
into suggested, sequenced work. It proposes no automatic change to the
formalism, operator effects, trusted policy, or upstream source artifacts.

## Guiding decision

Treat the Recursive AI Framework as RecursivePraxis’s upstream specification,
research pipeline, and reference oracle. Treat RecursivePraxis as the sole live
governed runtime.

```text
upstream baseline + evidence
        ↓
candidate, versioned experiment
        ↓
reproducible evaluation + acceptance
        ↓
trusted RecursivePraxis policy
```

No artifact may skip a stage or acquire live authority merely because it is
written beside a trusted JSON file.

## Priority 0 — establish safe lineage

### A1. Create an upstream-to-port manifest

**Purpose:** make every inherited or adapted semantic rule explicit.

Include, for each ported release:

- upstream repository revision and artifact hashes;
- source artifact → TypeScript consumer mapping;
- Python symbol → TypeScript symbol mapping, where relevant;
- status: `exact`, `adapted`, or `retired`;
- rationale for every adaptation; and
- links to characterization or parity tests.

**Done when:** a reviewer can answer “where did this RecursivePraxis behaviour
come from?” without relying on source comments or memory.

**Initial candidates:** `formalism.json`, commutator semantics,
`dissipation_calculator.py`, `phase_portrait.py`, and `inverse_solver.py`.

### A2. Declare ownership boundaries

**Purpose:** prevent two runtimes and two artifact pipelines from silently
becoming production authorities.

| Concern | Authority |
| --- | --- |
| Upstream formalism and research artifacts | Recursive AI Framework lineage |
| Live legality, budgets, tools, typed execution, traces, replay | RecursivePraxis |
| Candidate policy/effect experiments | Versioned experimental layer |
| Trusted-policy promotion | RecursivePraxis, through an explicit gate |

**Done when:** documentation and code labels distinguish baseline, candidate,
and trusted artifacts.

## Priority 1 — repair the upstream evidence boundary

### A3. Define a canonical `OperatorEvidenceRecord`

**Purpose:** make all extraction, mapping, refinement, and torsion stages speak
one identity and provenance language.

Suggested required fields:

```text
operator: one of the canonical 20 names | unresolved
scope: one | many | all-operators
sourceLocations: [...]
extractor: deterministic | model-assisted | manual
artifactHash: sha256
confidence: bounded value with stated meaning
candidateMappings: [...]
resolution: accepted | unresolved | rejected
```

`All` must be represented as `scope: all-operators`; it must never satisfy the
operator identifier type.

**Done when:** every downstream stage consumes this record or an explicitly
versioned derivative, and the torsion pipeline cannot create a 21st operator.

### A4. Use one mapping resolver in every downstream stage

**Purpose:** eliminate the present disagreement between curated mappings and
torsion’s first raw candidate.

Suggested policy:

- preserve alternatives and uncertainty in evidence records;
- permit one resolver to emit the normalized mapping used by refinement,
  magnitude integration, taxonomy, and torsion; and
- reject unresolved mappings from policy-bearing output unless a reviewer
  explicitly accepts an experimental interpretation.

**Done when:** commutator and torsion reports use the same declared operator
set, version, and mapping hash.

### A5. Make the upstream pipeline reproducible

**Purpose:** ensure a candidate can be recreated and audited from a clean
checkout.

Suggested work:

- package modules rather than relying on working-directory imports;
- declare all runtime dependencies, including `requests` if it remains used;
- record input corpus manifest, tool/model version, and command arguments;
- distinguish checked-in baseline data from generated candidate output; and
- produce a pipeline manifest containing input/output hashes and stage order.

**Done when:** a clean environment can reproduce a named artifact or fails
closed with a precise missing-input/dependency explanation.

## Priority 2 — establish port conformance

### A6. Build a Python–TypeScript characterization suite

**Purpose:** preserve intended upstream semantics while allowing deliberate
RecursivePraxis evolution.

Cover at least:

- all 20 operator identities: class, symbol, meaning, and intrinsic λ;
- dissipation and phase-portrait constants;
- legal/illegal sequence decisions that are intentionally shared;
- transition costs, state trajectories, attractors, and solver results for a
  fixed corpus of scenarios; and
- known intentional divergences, recorded as separate characterization cases.

**Done when:** an upstream change or port regression names the exact semantic
contract it breaks. Do not require parity where RecursivePraxis intentionally
adds governed-runtime behavior such as tool gates or redacted replay.

### A7. Classify Python runtime components as reference-only

**Purpose:** eliminate ambiguity between the upstream CLI/runtime and the
RecursivePraxis production runtime.

- Retain the Python calculator, phase portrait, and inverse solver as a
  reference oracle and research fixture.
- Scope `controlled_rupture_cli.py` to legacy/reference diagnostics, or retire
  it from active operational documentation.
- Do not add a production path in which Python and TypeScript both decide a
  live agent’s next action.

**Done when:** `lambda` is the only documented production control surface.

## Priority 3 — turn research outputs into safe candidates

### A8. Add a candidate-algebra package format

**Purpose:** prevent refined JSON from silently becoming trusted runtime data.

Each candidate should carry:

- baseline formalism version and hashes;
- normalized evidence and mapping versions;
- affected operators/pairs;
- coverage by operator and class;
- uncertainty and unresolved evidence;
- authoring tool/pipeline manifest;
- the explicit hypothesis being tested; and
- status: `draft`, `evaluating`, `rejected`, or `promoted`.

`commutator_skeleton_enhanced.json` is the first candidate to migrate into this
format. It remains non-authoritative until evaluated and promoted.

**Done when:** candidate artifacts cannot replace a baseline solely by sharing
its directory or filename convention.

### A9. Add coverage and quality gates

**Purpose:** make the current operator-coverage debt visible before a candidate
can influence policy.

Report and gate on:

- operator coverage: 20/20, plus per-class coverage;
- relation coverage: observed versus possible ordered/unordered pairs;
- mapping ambiguity and unresolved records;
- invalid identifiers, including `All` as an operator;
- evidence provenance completeness; and
- change concentration, such as a candidate dominated by `Meta` evidence.

**Done when:** the current “7 evidenced operators / no D-Structural evidence”
condition appears as an explicit failure or bounded experimental limitation,
not as an invisible property of generated data.

### A10. Redesign verification as layers

**Purpose:** preserve `Meta ∘ Meta` as a fast smoke signal without treating it
as whole-system validation.

| Layer | Suggested responsibility |
| --- | --- |
| Smoke | Existing high-signal sentinel and basic pipeline health |
| Schema/provenance | Artifact structure, hashes, IDs, mapping version |
| Coverage | All operators, classes, and claimed pairs |
| Conformance | Python–TypeScript semantic parity where shared |
| Candidate evaluation | Comparison with baseline on declared experiments |
| Promotion | Grounded outcomes, safety constraints, and acceptance |

**Done when:** every health claim identifies its layer and cannot imply a
stronger guarantee than it tested.

## Priority 4 — create a justified evolution loop

### A11. Specify the algebra-to-dynamics experiment protocol

**Purpose:** address the gap between relational upstream evidence and
per-operator RecursivePraxis effects without inventing a conversion.

For each experiment, require:

- a written mapping hypothesis from relational data to either a candidate
  selection rule or candidate effect table;
- the data required and why it can support that hypothesis;
- a baseline comparison;
- use of the existing `effects` and/or `candidates` experimentation seams;
- task-outcome, safety, and convergence criteria; and
- a stopping/rejection condition.

**Guardrail:** do not derive `(ΔD, ΔC)` merely from torsion or commutator values
until a method has been independently justified and evaluated.

**Done when:** a rejected experiment leaves trusted kernel behavior unchanged
and records why the hypothesis failed.

### A12. Repair and strengthen the promotion benchmark

**Purpose:** make the promotion gate evidence about produced outcomes rather
than the benchmark’s own wording.

First, verify the current benchmark behavior: its pass calculation evaluates
the `groundedCheck` against the objective as well as the generated summary.
Because the authored objectives contain the expected keywords, this may make a
case pass without demonstrating successful task execution.

Suggested correction:

- assess an independently produced artifact, test result, citation set, or
  human/domain review—not the objective text;
- preserve immutable benchmark inputs and expected checks;
- include negative controls and failure cases;
- record benchmark, host, policy, and artifact versions; and
- require all mandatory domain and safety checks to pass before promotion.

**Done when:** a policy cannot be promoted by echoing prompt vocabulary or by
rewriting benchmark metadata.

### A13. Implement a durable, fail-closed promotion record

**Purpose:** complete the roadmap’s learning lifecycle.

Promotion should bind together:

```text
candidate version + baseline version + evidence manifest
+ experiment results + benchmark results + acceptance decision
= immutable trusted policy release
```

Require an explicit acceptance authority appropriate to the policy’s scope;
for high-impact changes, this should include human review. A rejected candidate
must remain inspectable but unusable as trusted policy.

**Done when:** a future run can state precisely which trusted version it used,
why it was trusted, and which upstream evidence led to it.

## Priority 5 — simplify or retire duplicate paths

### A14. Consolidate extraction reporting

Fold `analyze_patterns.py` into the canonical pipeline report and make its
statistics derive from normalized evidence records.

### A15. Keep one artifact flow per purpose

Keep deterministic and model-assisted extraction as selectable strategies, not
as disconnected output directories. Retire or isolate dead artifact outputs
until a candidate-consumption workflow exists.

### A16. Keep unrelated prototypes out of the lineage

Leave `digital_city/prototype.py` separately scoped. Do not add it to the
operator, evidence, policy, or port-conformance architecture without new
evidence of relevance.

## Suggested sequence and decision gates

| Sequence | Actions | Decision gate |
| --- | --- | --- |
| 1. Establish facts | A1–A2 | Review agrees on source/port ownership and intentional divergences. |
| 2. Repair evidence identity | A3–A5 | A reproducible pipeline emits one vocabulary-consistent artifact set. |
| 3. Preserve semantics | A6–A7 | Shared upstream behavior is characterized; production authority is unambiguous. |
| 4. Admit candidates safely | A8–A10 | Candidate artifacts have provenance, coverage, and layered verification. |
| 5. Permit measured evolution | A11–A13 | A justified experiment passes real outcome and acceptance gates. |
| 6. Reduce ambiguity | A14–A16 | Duplicate and unrelated paths cannot be mistaken for trusted architecture. |

## Non-actions and guardrails

- Do not overwrite `formalism.json` or the trusted effect table with pipeline
  output.
- Do not treat co-occurrence, commutator magnitude, or torsion as proof of
  per-operator dynamics.
- Do not claim broad framework health from the `Meta ∘ Meta` sentinel.
- Do not turn the upstream Python runtime into a competing live control plane.
- Do not promote a candidate solely because its generated JSON parses,
  reproduces, or is colocated with trusted assets.

## Expected result

These actions create a disciplined chain from upstream inspiration to
RecursivePraxis evolution: the upstream remains visible and testable, research
artifacts become reproducible candidates, and only validated, accepted changes
can shape future governed execution.
