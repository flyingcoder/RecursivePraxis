# /review Command - Code Review Assistant

## Description

Assists with code reviews by analyzing changes, identifying issues, and providing feedback. Uses controlled rupture operators to ensure thorough and constructive reviews.

## Usage

```bash
/review <changes>
/review diff: <diff-path>
/review pr: <pr-number>
```

**Parameters:**

- `diff: <path>`: Review diff file
- `pr: <number>`: Review pull request

## What It Does

Applies controlled rupture operators:
- **Meta** (⟲): Reflect on code quality
- **Ortho** (⊥): Identify issues
- **Para** (∥): Explore alternatives
- **Weave** (🕸️): Integrate feedback

## Examples

```bash
/review diff: changes.diff
/review pr: 123
```

## Output

Provides:
- Code review comments
- Issue identification
- Improvement suggestions
- Best practice recommendations
- Security concerns

## When to Use

- Reviewing code changes
- Quality assurance
- Learning from reviews
- Ensuring standards

## Related

- Use `/attack` for adversarial review
- Use `/refactor` for improvements
