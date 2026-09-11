# /implement Command - Implementation Generator

## Description

Generates implementation code from specifications, following best practices and patterns. Uses controlled rupture operators to ensure implementations are correct, efficient, and maintainable.

## Usage

```bash
/implement <specification>
/implement spec: <spec-path>
/implement feature: <description>
```

**Parameters:**

- `spec: <path>`: Implement from specification file
- `feature: <description>`: Implement feature from description

## What It Does

Applies controlled rupture operators:
- **Telo** (→): Goal-directed implementation
- **Kata** (↓): Compress to efficient code
- **Ortho** (⊥): Correct and validate
- **Pro** (↷): Forward propagation

## Examples

```bash
/implement spec: api-spec.md
/implement feature: User authentication with JWT
```

## Output

Provides:
- Implementation code
- Tests
- Documentation
- Error handling
- Type definitions

## When to Use

- Implementing from specifications
- Generating code from designs
- Creating feature implementations

## Related

- Use `/spec` for specifications
- Use `/scaffold` for structure
- Use `/tests` for test generation
