# Recursive AI Framework as the Upstream of RecursivePraxis

## Scope and correction

This document is a corrected companion analysis to
[`recursive-ai-framework-python-files-evaluation.md`](./recursive-ai-framework-python-files-evaluation.md).
It does **not** modify that source inventory.

The governing correction is that the **Recursive AI Framework is upstream of,
and an inspiration for, RecursivePraxis**. RecursivePraxis is a TypeScript port
and evolution of that framework; it is not an independent runtime to which the
Python framework should simply be attached. Consequently, the relevant
question is not “how should two peer systems be integrated?” but:

> Which upstream responsibilities, semantics, evidence products, and
> verification practices should be preserved, translated, evolved, or retired
> in RecursivePraxis?

The distinction matters. The Python inventory supplies lineage and reference
behaviour. RecursivePraxis supplies the current governed execution boundary:
legal operator transitions, typed model interaction, budgets, capability gates,
redacted traces, semantic replay, and bounded recovery. The port may evolve the
upstream design, but it must make such divergence explicit and testable.

## Relationship to RecursivePraxis

### Source-derived observations

- The source inventory describes a 23-file Python codebase organised mostly as
  a JSON-artifact pipeline, plus a compiler/dynamics cluster and an LLM-based
  extraction cluster.
- Its source of truth is a 20-operator formalism, a commutator skeleton, and
  associated dissipation, phase-portrait, and inverse-solver mechanics.
- RecursivePraxis imports the ported `formalism.json` asset directly and its
  phase-portrait effects are documented as a verbatim port of the upstream
  Python default effects table. The roadmap also identifies `src/kernel/` as a
  first-party port of the sibling Lambda-engine lineage.
- The upstream pipeline produces corpus-derived mapping, commutator,
  contradiction, magnitude, and torsion artifacts, but the inventory identifies
  several broken or incomplete hand-offs: a dead enhanced-skeleton output, an
  orphaned LLM extraction path, divergent mapping readers, incomplete operator
  coverage, and the non-operator token `All` entering torsion output.

### Analytical interpretation

RecursivePraxis should regard the framework as having three upstream roles:

```text
Upstream specification        Upstream research/evidence       Upstream reference oracle
formalism + algebra      →    extraction + refinement      →   Python dynamics + solver
          │                           │                                │
          └────────── documented port and conformance boundary ───────┘
                                      │
                                      v
              RecursivePraxis: typed, governed, observable runtime
```

This preserves the upstream’s conceptual authority without freezing its known
implementation defects into the port. In particular, corpus-derived artifacts
are **candidate evidence about the formalism**; they are not automatically the
formalism itself, and they do not automatically calibrate RecursivePraxis’s
per-operator state effects.

## Classification of the upstream inventory

The categories below describe each item’s most useful contribution to the
upstream-to-port relationship. A second category is included only where it is
material. The categories are not exclusive: an extractor both discovers and
creates an artifact, for example.

| Upstream item | Classification | Correct role for RecursivePraxis |
| --- | --- | --- |
| `formalism.json`, `commutator_skeleton.json` | **Define** | Versioned upstream specification and baseline porting input. Preserve provenance and characterize intentional deviations. |
| `pattern_extract.py` | **Discover**, Create | Deterministic baseline for discovering corpus evidence. |
| `operator_extractor.py`, `equation_extractor.py`, `contradiction_extractor.py` | **Discover**, Create | Model-assisted upstream research path; retain only behind a common evidence contract. |
| `build_contradiction_taxonomy.py` | **Discover**, Define | Derives candidate contradiction categories and their evidence. |
| `analyze_patterns.py` | **Discover** | Low-authority exploratory report, not a policy input by itself. |
| `build_operator_mapping.py` | **Define**, Orchestrate | Defines the translation from upstream corpus glyphs to the normative 20-operator names. |
| `refine_commutators.py` | **Transform** | Converts observed relations into a candidate revision of the upstream commutator algebra. |
| `integrate_magnitudes.py` | **Transform** | Produces an enhanced candidate skeleton; it has no effect until an explicit adoption path exists. |
| `build_torsion_field.py` | **Discover**, Transform | Derives relational diagnostics; it must not create new operators or fabricate λ values. |
| `dissipation_calculator.py` | **Support**, Influence | Upstream reference semantics for transition dissipation and parity checks. |
| `phase_portrait.py` | **Influence**, Support | Upstream reference for state dynamics and advisory operator suggestions. |
| `inverse_solver.py` | **Support**, Orchestrate | Upstream reference search implementation and solver-conformance input. |
| `controlled_rupture_cli.py` | **Complete**, Support | Historical operationalisation of the upstream dynamics; retain as a reference interface, not a second production CLI. |
| `core/extractor_base.py`, `openrouter_client.py` | **Support** | Shared extraction, checkpointing, and transport infrastructure. |
| `cli/extract.py`, `setup.py` | **Orchestrate** | Coordinate the upstream research pipeline; should yield reproducible, manifest-backed artifacts. |
| `test_20_operators.py`, `test_everything.py`, `test_enhanced_magnitudes.py` | **Complete**, Refine | Upstream conformance and regression evidence. |
| `health_check.py` | **Refine**, Support | Fast pipeline sentinel; not a complete health claim. |
| `commutator_skeleton_enhanced.json` | **Transform** | Candidate derivative of the baseline, not a replacement source of truth. |
| `digital_city/prototype.py` | — | No evidenced role in the upstream lineage of RecursivePraxis; do not force a classification. |

## Critical analysis

### Gaps

#### 1. No explicit upstream-to-port conformance contract

The port relationship is visible in source comments and documentation, but the
inventory has no durable manifest that says:

- which upstream version and artifacts were ported;
- which Python functions correspond to which TypeScript symbols;
- whether each correspondence is exact, intentionally adapted, or retired;
- what tests demonstrate the relationship.

Without this, a TypeScript improvement can become indistinguishable from
accidental semantic drift.

#### 2. No canonical evidence schema or vocabulary resolver

The pipeline has two mapping interpretations: commutator refinement consumes
curated `primary_recommendations`, while torsion takes the first raw candidate.
This yields different operator sets and permits `All`—a scope annotation—to
enter the torsion field as an operator. A port cannot faithfully learn from an
upstream artifact whose identity semantics are inconsistent.

#### 3. Coverage is too uneven to support general calibration

Only seven operators receive corpus evidence; every D-Structural operator is
unevidenced. The grammar constrains four operators, while the health sentinel
is effectively one `Meta ∘ Meta` pair. This is not a representative empirical
basis for revising a twenty-operator runtime.

#### 4. The algebra-to-dynamics bridge remains unspecified

The upstream evidence is relational—commutators, co-occurrence, torsion—while
RecursivePraxis’s phase portrait uses per-operator `(ΔD, ΔC)` displacements.
The existing algebra/dynamics audit correctly concludes that the former does
not justify inferring the latter. The missing mechanism is an explicit,
falsifiable hypothesis and evaluation method, not another automatic JSON
import.

#### 5. Missing provenance and reproducibility boundaries

The upstream inventory reports untracked pipeline inputs/outputs, generated
data committed while inputs are absent, fragile imports, and undeclared runtime
dependencies. Those are porting risks: neither an artifact’s derivation nor its
exact meaning can be reliably reproduced from a fresh checkout.

#### 6. No validated learning lifecycle

The upstream pipeline can create candidate algebra artifacts, and
RecursivePraxis has experimental policy promotion, but neither provides the
complete chain:

```text
evidence → candidate → reproducible evaluation → acceptance/rejection
         → immutable promoted version → use in later runs
```

This is the principal gap between upstream research outputs and the roadmap’s
goal of validated changes to future reasoning.

### Redundancies

| Overlap | Assessment | Correction |
| --- | --- | --- |
| Regex extraction and LLM extraction | Both are useful research strategies, but currently form disconnected pipelines. | Keep both, but expose one normalized artifact schema and one pipeline manifest. |
| Curated mapping versus torsion’s raw-candidate interpretation | This is conflicting ownership, not productive redundancy. | Establish one canonical resolver used by every downstream stage. |
| Python dynamics/solver and TypeScript kernel | Expected overlap in a port; harmful only if both are treated as live production authorities. | Keep Python as a versioned reference oracle; keep TypeScript as the production runtime. |
| `controlled_rupture_cli.py` and `lambda` | Overlapping operational surfaces across upstream and port. | Scope the Python CLI to legacy/reference diagnostics or retire it from active workflows. |
| `health_check.py` and larger tests | A smoke test and a matrix test have different purposes, but the sentinel is over-relied upon. | Retain the sentinel; add broad coverage and explicit artifact-quality tests. |
| `analyze_patterns.py` and extraction reports | Both expose counts without a coherent reporting contract. | Fold the former into the evidence-quality report. |

### Misclassifications

The source inventory’s labels—Define, Discover, Quantify, Execute, Verify, and
Unrelated—describe its relationship to the operator vocabulary. They do not
directly answer the requested contribution taxonomy. The following
reclassifications therefore clarify role rather than accuse the source document
of an error.

| Source treatment | Corrected classification | Reason |
| --- | --- | --- |
| `build_operator_mapping.py` as Discover | **Define**, Orchestrate | Its curated mapping establishes a normative semantic bridge for every later stage. |
| Quantify group | **Transform**; torsion also **Discover** | These processes create candidate algebraic artifacts rather than merely measure neutral facts. |
| Python compiler/dynamics group as Execute | **Support**, Influence | In the port relationship, it specifies and tests reference behaviour; RecursivePraxis executes in production. |
| `openrouter_client.py` as unrelated to the vocabulary | **Support** | It is vocabulary-neutral but directly supports upstream model-assisted discovery. |
| Test scripts as Verify | **Complete**, Refine | They operationalize and strengthen an upstream release/conformance boundary. |
| `analyze_patterns.py` as unrelated | **Discover** | It does investigate corpus distribution, even if it cannot carry authority. |
| `digital_city/prototype.py` as unrelated | Unclassified | No contribution to this lineage is evidenced; keeping it out is more accurate than assigning a category. |

### Emergent concepts

#### The porting contract

The formalism assets, Python dynamics, TypeScript kernel, and parity-oriented
tests imply a first-class architectural object: an **upstream-to-port
contract**. It should state what RecursivePraxis inherits, what it deliberately
changes, and the evidence that preserves meaning across languages.

#### The evidence-to-policy release train

Extraction, mapping, commutator refinement, magnitude integration, torsion,
benchmarking, and promotion together imply a release train:

```text
baseline upstream algebra
  → evidence-backed candidate
  → coverage/provenance checks
  → isolated port experiment
  → grounded evaluation and acceptance
  → trusted RecursivePraxis policy version
```

This is the safe realization of recursive evolution. It does not confuse an
upstream research result with a runtime instruction.

#### Operator-coverage debt

The same small subset of operators dominates extraction, refinement, grammar,
and health checking. This is not merely missing data: it systematically biases
the apparent validity of the upstream formalism and any ported policy. Coverage
should be a release criterion, reported by class and operator.

#### Two distinct authorities

The upstream framework has authority over **lineage and candidate algebraic
evidence**. RecursivePraxis has authority over **what a live agent may do and
what policy may be trusted**. A successful port preserves the former while
enforcing the latter.

## Proposed corrections

These are proposed changes to the inventory’s organisation and integration
model, not silent changes to its source artifacts.

1. Create an upstream manifest for every ported release: upstream revision,
   artifact hashes, Python-to-TypeScript symbol mapping, status (`exact`,
   `adapted`, `retired`), and associated conformance tests.

2. Define one `OperatorEvidenceRecord` contract. It should use only the
   canonical 20-name operator union; represent `All` as a scope/quantifier;
   retain source locations, extractor identity, confidence, artifact hashes,
   and unresolved alternatives.

3. Make refined commutators, enhanced skeletons, and torsion fields candidate
   revisions with a baseline version, coverage report, and provenance manifest.
   None may overwrite the trusted formalism by file placement.

4. Preserve the Python dissipation calculator, phase portrait, and inverse
   solver as reference-oracle fixtures. Add TypeScript parity tests for agreed
   semantics, and characterization tests whenever RecursivePraxis deliberately
   evolves them.

5. Treat calibration as an experiment. Do not infer `(ΔD, ΔC)` directly from
   relational commutator/torsion data. State the mapping hypothesis, exercise
   RecursivePraxis’s `effects`/`candidates` seams, and evaluate it against
   outcome-based benchmarks before promotion.

6. Replace the single-pair health claim with layered checks: schema validity,
   artifact provenance, all-operator/all-pair coverage, Python–TypeScript
   conformance, candidate-policy benchmarks, safety constraints, and explicit
   human acceptance where required.

7. Make promotion fail closed. A candidate becomes trusted only after
   reproducible evidence, declared coverage, valid grounded evaluation, and a
   durable promotion record. Correct the current benchmark so it evaluates
   produced outcomes rather than matching its own objective text.

## Corrected and reorganized inventory

| Contribution category | Upstream inventory | Intended contribution to RecursivePraxis |
| --- | --- | --- |
| **Define** | Formalism and commutator baseline; canonical operator mapping | Preserve upstream meaning and make every adaptation explicit. |
| **Discover** | Regex/LLM extraction, contradiction taxonomy, torsion diagnostics, pattern analysis | Produce bounded claims and expose evidence gaps. |
| **Create** | Normalized extraction output and candidate evidence bundles | Materialize reproducible upstream research artifacts. |
| **Transform** | Mapping, commutator refinement, magnitude integration, candidate torsion products | Generate experimental revisions, never implicit runtime truth. |
| **Refine** | Health and regression checks; coverage and parity reports | Strengthen confidence and reveal mismatch or drift. |
| **Influence** | Phase portrait, dissipation logic, solver, evaluated candidate policies | Inform port evolution through measured experiments. |
| **Support** | Extractor infrastructure, transport, Python reference mechanics | Sustain reproducible research and conformance work. |
| **Orchestrate** | Upstream setup/extraction pipeline; artifact registry; evaluation/promotion workflow | Connect lineage, evidence, experiments, review, and release. |
| **Complete** | Conformance suite, acceptance record, immutable trusted policy release | Establish when an upstream-derived change is safe for future RecursivePraxis runs. |
| **Out of scope** | `digital_city/prototype.py`; duplicate live execution interfaces | Keep unrelated prototypes and parallel production control planes outside the port boundary. |

## Conclusion

RecursivePraxis should be understood as the governed, observable evolution of
the Recursive AI Framework—not a separate consumer of it. The framework’s
formalism and dynamics are upstream reference material; its extraction and
refinement pipeline is an upstream research capability; and its tests are the
starting point for port conformance. The next architectural step is a strict,
versioned contract between those upstream assets and RecursivePraxis’s trusted
runtime policy. That makes evolution traceable: preserve upstream intent,
measure proposed changes, promote only validated improvements, and keep every
live agent action within RecursivePraxis’s explicit control boundary.
