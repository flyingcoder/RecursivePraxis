# /debt Command - Technical Debt Analyzer

## Description

Identifies and analyzes technical debt, prioritizing improvements and creating remediation plans. Uses controlled rupture operators to understand debt patterns and plan effective resolution.

## Usage

```bash
/debt <scope>
/debt analyze: <path>
/debt prioritize: <scope>
```

**Parameters:**

- `analyze: <path>`: Analyze technical debt in path
- `prioritize: <scope>`: Prioritize debt remediation

## What It Does

Applies controlled rupture operators:
- **Retro** (↶): Understand debt origins
- **Meta** (⟲): Reflect on debt patterns
- **Kata** (↓): Prioritize and compress
- **Telo** (→): Plan remediation

## Examples

```bash
/debt analyze: src/
/debt prioritize: critical
```

## Output

Provides:
- Debt inventory
- Priority rankings
- Remediation plans
- Cost estimates
- Risk assessment

## When to Use

- Assessing codebase health
- Planning improvements
- Prioritizing refactoring
- Understanding legacy code

## Related

- Use `/refactor` for remediation
- Use `/implement` for improvements
