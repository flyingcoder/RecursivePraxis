# /attack Command

## Description

Applies anomaly detection (HALIRA Step 5) to attack your own design or solution. Critical step for finding irreducible flaws before proceeding.

## Usage

```bash
/attack <solution>
/attack design: <description>
/attack solution: <description>
/attack code: <file-path>
```

**Parameters:**

- `solution`: The solution, design, or code to attack

## What It Does

Becomes the adversary and attacks your own design:
- Finds what breaks it
- Identifies edge cases
- Discovers contradictions
- Reveals assumptions
- Finds failure modes
- Identifies Jacobi Anomaly (irreducible flaw)

## Examples

```bash
/attack design: Event sourcing + CQRS architecture
# Attacks the architecture to find flaws

/attack solution: Use Redis for caching
# Finds what breaks this caching solution

/attack code: src/api/auth.ts
# Attacks the auth code to find vulnerabilities
```

## Output

Provides:
- Attack vectors
- Edge cases
- Contradictions
- Assumptions that might fail
- Failure modes
- Irreducible flaws (if found)
- Recommendations for fixes or paradigm shifts

## When to Use

- After creating a solution
- Before implementing a design
- Code review
- Architecture review
- Finding flaws proactively
- HALIRA Protocol Step 5

## Critical Note

This is HALIRA Protocol Step 5 - DO NOT SKIP. This is the engine of the entire process. Always attack your own designs before proceeding.

## Related

- See `.cursor/rules/workflow/halira-protocol.mdc` for HALIRA details
- Use `/halira` for full protocol
- Use `/rupture` for paradigm shifts after finding anomalies

