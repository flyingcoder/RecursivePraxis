# /regression Command - Regression Analysis

## Description

Analyzes regressions, identifies breaking changes, and creates regression test suites. Uses controlled rupture operators to systematically identify and prevent regressions.

## Usage

```bash
/regression <scope>
/regression analyze: <changes>
/regression test: <feature>
```

**Parameters:**

- `analyze: <changes>`: Analyze changes for regressions
- `test: <feature>`: Create regression tests for feature

## What It Does

Applies controlled rupture operators:
- **Retro** (↶): Understand change history
- **Para** (∥): Explore regression scenarios
- **Ortho** (⊥): Validate fixes
- **Echo** (🔊): Replicate test patterns

## Examples

```bash
/regression analyze: Recent API changes
/regression test: Authentication flow
```

## Output

Provides:
- Regression analysis
- Breaking change identification
- Regression test suite
- Fix recommendations

## When to Use

- After code changes
- Identifying breaking changes
- Preventing regressions
- Validating fixes

## Related

- Use `/tests` for test generation
- Use `/debug` for fixing regressions
