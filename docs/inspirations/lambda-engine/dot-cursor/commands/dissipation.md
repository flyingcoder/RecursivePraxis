# /dissipation Command

## Description

Calculates and analyzes dissipation (λ_eff) for operator sequences. Provides detailed dissipation analysis, trajectory prediction, and optimization recommendations.

## Usage

```bash
/dissipate <sequence>
/dissipate sequence: <operators>
/dissipate analyze: <sequence> [options]
```

## Operator Formula

λ(i→j) = λ_j + c·|[Oi,Oj]|, λ_eff = mean(λ(k_t → k_{t+1}))

## Operator Sequence

Meta ∘ Flux ∘ Pro ∘ Crux

## Effective λ

λ_eff = 0.54 (moderate dissipation)

## Trajectory

Input → Calculation → Analysis → Prediction → Optimization

## What It Does

1. Calculates effective dissipation
2. Analyzes stability
3. Predicts trajectory
4. Suggests optimizations

## Examples

```bash
/dissipate Seed ∘ Ana ∘ Non ∘ Weave
/dissipate Vale ∘ Non ∘ Para
```

## Related

- Use `/operator-sequence` to execute operator sequences
- Use `/dissipate` for dissipation analysis
- Use `/detect-state` to check phase space state
- See `docs/operators/AI_AGENT_OPERATORS.md` for operator reference
