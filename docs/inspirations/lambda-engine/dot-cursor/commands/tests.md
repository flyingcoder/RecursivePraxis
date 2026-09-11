# /tests Command - Test Generator

## Description

Generates comprehensive test suites including unit, integration, and e2e tests. Uses controlled rupture operators to ensure tests are thorough and maintainable.

## Usage

```bash
/tests <target>
/tests file: <file-path>
/tests feature: <feature-name>
```

**Parameters:**

- `file: <path>`: Generate tests for file
- `feature: <name>`: Generate tests for feature

## What It Does

Applies controlled rupture operators:
- **Para** (∥): Explore test scenarios
- **Weave** (🕸️): Integrate test cases
- **Ortho** (⊥): Validate test correctness
- **Kata** (↓): Compress to efficient tests

## Examples

```bash
/tests file: src/utils/validation.ts
/tests feature: User authentication
```

## Output

Provides:
- Unit tests
- Integration tests
- Test fixtures
- Mock setups
- Coverage analysis

## When to Use

- Creating test suites
- Adding test coverage
- Validating implementations
- Ensuring quality

## Related

- Use `/implement` for implementation
- Use `/regression` for regression testing
