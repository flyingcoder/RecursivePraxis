# /operator-sequence Command

## Description

Executes a sequence of Controlled Rupture operators to transform a problem state. Applies operators in order, tracking dissipation and state transitions.

## Usage

```bash
/operator-sequence <sequence> [context]
/operator-sequence sequence: <operators> [context: <description>]
```

## Operator Formula

O₁ ∘ O₂ ∘ ... ∘ Oₙ (composition) or O₁ + O₂ + ... + Oₙ (parallel)

## Operator Sequence

Applied in order with state transitions tracked

## Effective λ

λ_eff = mean(λ₁, λ₂, ..., λₙ)

## Trajectory

Start State → Intermediate States → End State → Attractor

## What It Does

1. Parses and validates sequence
2. Calculates dissipation
3. Applies operators
4. Reports results

## Examples

```bash
/operator-sequence Seed ∘ Ana ∘ Non ∘ Weave
/operator-sequence sequence: Telo + Kata + Non + Crux context: Define project goal
```

## Related

- Use `/operator-sequence` to execute operator sequences
- Use `/dissipate` for dissipation analysis
- Use `/detect-state` to check phase space state
- See `docs/operators/AI_AGENT_OPERATORS.md` for operator reference
