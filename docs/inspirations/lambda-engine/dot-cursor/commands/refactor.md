# /refactor Command - Refactoring Assistant

## Description

Assists with code refactoring, identifying improvement opportunities and applying transformations safely. Uses controlled rupture operators to ensure refactoring maintains functionality while improving structure.

## Usage

```bash
/refactor <code-path>
/refactor file: <path>
/refactor pattern: <pattern-name>
```

**Parameters:**

- `file: <path>`: Refactor specific file
- `pattern: <name>`: Apply refactoring pattern

## What It Does

Applies controlled rupture operators:
- **Ana** (↑): Abstract to identify patterns
- **Kata** (↓): Compress and simplify
- **Weave** (🕸️): Integrate improvements
- **Ortho** (⊥): Validate correctness

## Examples

```bash
/refactor file: src/utils/validation.ts
/refactor pattern: Extract method
```

## Output

Provides:
- Refactored code
- Before/after comparison
- Test updates
- Impact analysis

## When to Use

- Improving code structure
- Applying design patterns
- Reducing complexity
- Improving maintainability

## Related

- Use `/debt` for technical debt analysis
- Use `/tests` to ensure tests pass
