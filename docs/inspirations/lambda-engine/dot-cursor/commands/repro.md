# /repro Command - Reproduction Assistant

## Description

Helps reproduce bugs and issues by analyzing symptoms and creating reproduction steps. Uses controlled rupture operators to systematically identify root causes.

## Usage

```bash
/repro <issue>
/repro bug: <description>
/repro error: <error-message>
```

**Parameters:**

- `bug: <description>`: Reproduce bug from description
- `error: <message>`: Reproduce error from message

## What It Does

Applies controlled rupture operators:
- **Retro** (↶): Trace backward from symptom
- **Meta** (⟲): Reflect on reproduction steps
- **Ortho** (⊥): Validate reproduction
- **Pro** (↷): Forward to solution

## Examples

```bash
/repro bug: User login fails with 500 error
/repro error: TypeError: Cannot read property 'id'
```

## Output

Provides:
- Reproduction steps
- Minimal test case
- Environment details
- Root cause analysis

## When to Use

- Debugging issues
- Creating bug reports
- Isolating problems
- Understanding failures

## Related

- Use `/debug` for debugging
- Use `/tests` for test cases
