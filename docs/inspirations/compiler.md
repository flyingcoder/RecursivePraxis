# Compiler

## Purpose

The compiler is the **mechanical interpreter** of the twenty-operator algebra. Given a cognitive state `(D, C)` or a named problem template, it computes dissipation of operator sequences, simulates trajectories on the three-attractor phase portrait, and searches for a short sequence that reaches a target while paying dissipation and attractor penalties—and while obeying hard composition constraints. It exists to turn Controlled Rupture from a theory into a pathfinder: diagnose → sequence → warn.

## Overview

Four cooperating pieces share one formalism spec (v2.0.0):

1. **Dissipation calculator** — loads intrinsic `λ` per operator and pairwise commutator magnitudes; implements `λ(i→j)`, sequence-mean `λ_eff`, exponential decay of `D`, total cost, and a full λ matrix.
2. **Phase portrait** — Lyapunov `V = D + α C` (`α = 0.4`), attractor classification, suggested transition operators, basin sampling, trajectory simulation via fixed `(ΔD, ΔC)` effects per operator.
3. **Inverse solver** — beam-search A* over the twenty operators; cost `J = d(x_T, target) + β Σλ + γ · AttractorPenalty` (`β = 0.7`, `γ = 1.1`); hard constraints prune the expansion.
4. **Compiler facade / CLI** — loads the commutator skeleton into both the facade calculator and the solver’s calculator; exposes diagnose, analyze, list, and custom solve.

The compiler does **not** yet ingest extractor JSON at runtime. Commutators default from the sign skeleton (`±1 → magnitude 1.0`). An enhanced skeleton with empirical magnitudes exists as a data product; the default loader still points at the sign-only table.

## Flow

1. **Input.** A CLI command: `list`; `diagnose <template>`; `analyze <sequence>` (`∘` or comma-separated names); or `custom --initial D,C --target D,C`. Programmatic use constructs the facade or the three engines directly.
2. **Validation.** Unknown problem keys raise. Sequences are split into operator name tokens (unknown names still flow into λ lookup and can KeyError). Custom states are parsed as two floats. Solver expansion refuses illegal next operators.
3. **Processing.**
   - *Diagnose:* map template → initial/target `(D, C)`, classify attractors, suggest transition ops, beam-search a path (`beam_width=10`).
   - *Analyze:* parse sequence → pairwise λ, `λ_eff`, total cost, half-life; simulate from `(0.5, 0.5)` (`S*`); emit warnings (too many Meta, Void entry, Meta→Non, Non→Para, `λ_eff > 0.8`).
   - *Custom:* same solver with verbose search.
4. **Output.** Printed analysis plus a solution dict: `sequence`, `final_state`, `cost`, `cost_breakdown` (`terminal_distance`, `dissipation_cost`, `attractor_penalty`, `total`), `success`, `length`. Analyze returns the dissipation analysis dict. Failure to hit distance ≤ 0.12 within 14 steps still returns the best partial path.

## Key Components

- **Formalism spec** — operators, classes, algebra relations, dissipation constants, attractor topology, solver hyperparameters, “cognitive bootloader” mappings (λ as `∂/∂t`, chains as boot instructions).
- **Commutator skeleton** — 400 sign/resultant pairs; ground truth. Enhanced variant adds a magnitude channel from corpus extraction (few pairs evidence-based).
- **Dissipation calculator** — `lambda_pairwise`, `lambda_effective`, `predict_decay` (`D(t) = D0 exp(-λ_eff t)`), `total_dissipation_cost`, `get_lambda_matrix`, `analyze_sequence` (including half-life `ln(2)/λ_eff`).
- **Attractor enum** — `J=0`, `S*`, `∅`.
- **Phase portrait** — `lyapunov_function`, `classify_attractor`, `suggest_transition_operators`, `get_attractor_penalty` (0.1 / 0.3 / 1.0), `simulate_trajectory`, basin analysis, default operator effects (A-class negative ΔD/ΔC; B-class positive; C small mixed; D mostly stabilizing except Vale).
- **Search node** — state `(D, C)`, sequence, `cost_so_far`, `estimated_total_cost` (heap-ordered).
- **Inverse solver** — Euclidean distance, apply-and-clamp, `violates_constraints`, `compute_cost`, admissible distance heuristic, `solve` (beam of best-N nodes, max 1000 iterations).
- **Compiler facade** — five problem templates (`stuck`, `overwhelmed`, `rigid`, `collapsed`, `procrastinating`) with canned `(D, C)` endpoints and diagnoses; wires skeleton load; diagnose / analyze / custom / list.
- **CLI** — subcommands mapping onto the facade.

**Problem templates (intent):**

| Key | Diagnosis | Typical move |
|-----|-----------|----------------|
| stuck | Meta loop, high D/C | compress + goal (`Kata`, `Telo`, often Weave/Latch in v2 search) |
| overwhelmed | Ana without Kata | compress + Ortho |
| rigid | over-Ortho, sterile J=0 | inject Para |
| collapsed | Void | rescue via Kata/Ortho/Telo |
| procrastinating | S* without action | Telo + Kata |

## Data / State

**State:** `(D, C) ∈ [0, 1]²`. Lyapunov `V = D + 0.4 C`. `J=0` iff `V < 0.3`; Void if `D > 0.8` or `C > 0.9`; else `S*`.

**Operator effects:** hand-estimated `(ΔD, ΔC)` from class and λ (not learned from extraction yet). States clamp after each step.

**Dissipation analysis:**

- `lambda_effective`, `total_cost`, `pairwise_costs[{step, transition, lambda}]`, `predicted_decay`, `half_life`

**Solver config (from formalism):** distance threshold `0.12`, max path length `14`, attractor penalties as above.

**Trajectory step:** `step`, `operator`, `D`, `C`, `V`, `attractor`.

## Constraints

- Search space is discrete 20-operator alphabet; continuous control is not modeled.
- Hard constraints: max two consecutive Meta; no Non after Meta; no Para after Non; no Ana as a near-final operator (enforced when length ≥ max−1, not strictly “never last” for short paths).
- Analyze-time warnings overlap the solver constraints but do not block analysis.
- Default commutator magnitudes are binary; dissipation numbers are therefore coarse until extraction magnitudes are wired in.
- Inverse `solve` does not reconstruct a full forward trajectory in the returned payload (final state only); the facade’s diagnose uses that payload.
- `_format_solution` notes a missing initial state when rebuilding trajectory—callers should not assume a complete path history from the dict.
- `can_transition` keys do not match the formalism’s transition map naming, so that helper is unreliable; suggestions use a separate hardcoded map.
- Operator effects and λ decay are **two models** of D (additive ΔD vs exponential decay); diagnose uses additive effects for search, analyze prints both λ-decay and additive trajectory.
- Python deps for the compiler (numpy) are not listed in the engine’s pip requirements file (that file only pins `anthropic`). Run compiler modules from their own directory so local imports resolve.
- Extraction → compiler loop is aspirational: magnitudes are not auto-loaded from `operators.json` / `equations.json`.

## Testing

The twenty-operator suite (seven modules, intended all-pass on v2.0.0):

1. Formalism structure (version, twenty names, class counts).
2. Commutator skeleton completeness (400 entries).
3. Dissipation calculator load + mixed-class sequences + 20×20 λ matrix.
4. Phase portrait: 20 effects, stabilize/destabilize/reflect trajectories, basin sample (~500 points; theory cites ~10% / 61% / 29%).
5. Inverse solver: twenty operators available; gentle stabilization and void-escape problems; may emit newer operators.
6. CLI integration: 400 commutators loaded; analyze `Seed ∘ Weave ∘ Bind ∘ Latch`; five templates listed.
7. Class λ ordering: constructive average < disruptive average.

Per-engine `example_usage` scripts (dissipation, portrait, solver) are manual demos, not assertions. Extractor outputs are not part of compiler tests. Known gaps: constraint unit tests, KeyError on unknown operator tokens, and wiring of enhanced commutator magnitudes.
