# /debug Command - Debugging Assistant

## Description

Assists with debugging by analyzing code, identifying issues, and suggesting fixes. Uses controlled rupture operators to systematically debug problems.

## Usage

```bash
/debug <code or issue>
/debug code: <file-path>
/debug issue: <description>
```

**Parameters:**

- `code: <path>`: Debug code in file
- `issue: <description>`: Debug issue from description

## What It Does

Applies controlled rupture operators:
- **Retro** (↶): Trace backward from error
- **Ortho** (⊥): Correct issues
- **Meta** (⟲): Reflect on debugging approach
- **Pro** (↷): Forward to fix

## Examples

```bash
/debug code: src/api/auth.ts
/debug issue: Memory leak in data processing
```

## Output

Provides:
- Issue identification
- Root cause analysis
- Fix suggestions
- Code corrections
- Prevention strategies

## When to Use

- Fixing bugs
- Understanding errors
- Analyzing failures
- Improving code quality

## Related

- Use `/repro` for reproduction
- Use `/tests` for validation
