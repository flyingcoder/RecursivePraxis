# /threat Command - Threat Modeler

## Description

Creates threat models, identifies security risks, and designs mitigation strategies. Uses controlled rupture operators to ensure comprehensive security analysis.

## Usage

```bash
/threat <system>
/threat model: <system>
/threat analyze: <component>
```

**Parameters:**

- `model: <system>`: Create threat model for system
- `analyze: <component>`: Analyze threats for component

## What It Does

Applies controlled rupture operators:
- **Para** (∥): Explore attack vectors
- **Non** (¬): Negate security assumptions
- **Ortho** (⊥): Validate security
- **Weave** (🕸️): Integrate mitigations

## Examples

```bash
/threat model: Authentication system
/threat analyze: API endpoints
```

## Output

Provides:
- Threat model
- Attack vectors
- Risk assessment
- Mitigation strategies
- Security controls

## When to Use

- Designing secure systems
- Security reviews
- Risk assessment
- Compliance requirements

## Related

- Use `/secrets` for secrets management
- Use `/privacy` for privacy analysis
