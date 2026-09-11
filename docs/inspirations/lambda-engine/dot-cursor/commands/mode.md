# /mode Command

## Description

Detects and reports the operational mode (Duality Navigation vs HALIRA Protocol) for a given problem or task.

## Usage

```bash
/mode <problem>
/mode detect: <description>
/mode analyze: <task>
```

**Parameters:**

- `problem`: The problem or task to analyze for mode detection

## What It Does

Mode detection:
- Analyzes problem for contradictions
- Determines if Mode 1 (J=0) or Mode 2 (J'≠0) is needed
- Explains reasoning
- Suggests appropriate approach

## Examples

```bash
/mode detect: Fix login bug
# Analyzes if routine fix (Mode 1) or paradigm shift (Mode 2)

/mode analyze: Scale database system
# Detects if contradiction exists requiring HALIRA

/mode Need both X and Y but they conflict
# Detects Mode 2 (HALIRA) due to contradiction
```

## Output

Provides:
- Mode detection (J=0 or J'≠0)
- Reasoning for mode selection
- Recommended approach
- Contradiction detection (if any)
- Next steps

## When to Use

- Unsure which approach to use
- Want to verify mode detection
- Analyzing problem complexity
- Before starting work

## Related

- See `.cursor/rules/general/bimodal-operation.mdc` for details
- Use `/halira` if Mode 2 detected
- Use standard approach if Mode 1 detected

