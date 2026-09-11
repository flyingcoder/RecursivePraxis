# /retro Command

## Description

Applies retro-operators to analyze past decisions, work backward from problems, or learn from history. Useful for understanding legacy code, debugging, and learning from past patterns.

## Usage

```bash
/retro <operation> <target>
/retro active <code-path>
/retro deductive <problem>
/retro ject <pattern>
/retro agnostic <decision>
```

**Operations:**

- `active` - Apply current knowledge to understand past decisions
- `deductive` - Work backward from conclusion/symptom to root cause
- `ject` - Map current patterns onto past situations
- `agnostic` - Recognize what past couldn't know
- `gnostic` - Formal understanding of prior state
- `synthesis` - Deconstruct past systems to components

## Examples

```bash
/retro active src/legacy/auth.ts
# Analyzes why old auth code was written that way, applying current knowledge

/retro deductive Users can't log in
# Works backward from symptom to find root cause

/retro ject Missing null checks
# Applies pattern from past bugs to current code

/retro agnostic Why was this hardcoded?
# Recognizes what past developers couldn't have known
```

## Output

Provides analysis using retro-operators:
- **Retroactive**: Current knowledge applied to past
- **Retrodeductive**: Backward reasoning chain
- **Retrojection**: Pattern mapping
- **Retroagnostic**: Limitation recognition
- **Retrognostic**: Formal past understanding
- **Retrosynthesis**: Component breakdown

## When to Use

- Understanding legacy code
- Debugging by working backward
- Learning from past mistakes
- Code review of old decisions
- Historical pattern analysis

## Related

- See `.cursor/rules/general/retro-operators.mdc` for details
- Use `/halira` for contradictions
- Use `/telo` for forward acceleration

