# /safety Command - AI Safety Analyzer

## Description

Analyzes AI safety concerns including alignment, robustness, and ethical considerations. Uses controlled rupture operators to ensure comprehensive safety analysis.

## Usage

```bash
/safety <system>
/safety analyze: <model>
/safety alignment: <system>
```

**Parameters:**

- `analyze: <model>`: Analyze safety for model
- `alignment: <system>`: Check alignment

## What It Does

Applies controlled rupture operators:
- **Non** (¬): Negate safety assumptions
- **Para** (∥): Explore failure modes
- **Ortho** (⊥): Validate safety
- **Meta** (⟲): Reflect on ethics

## Examples

```bash
/safety analyze: LLM system
/safety alignment: Autonomous agent
```

## Output

Provides:
- Safety analysis
- Risk assessment
- Alignment evaluation
- Mitigation strategies
- Ethical considerations

## When to Use

- AI safety reviews
- Risk assessment
- Alignment verification
- Ethical AI

## Related

- Use `/eval` for evaluation
- Use `/threat` for threat analysis
