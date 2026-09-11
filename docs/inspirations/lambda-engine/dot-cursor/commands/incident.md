# /incident Command - Incident Response Assistant

## Description

Assists with incident response, providing runbooks, analysis tools, and recovery procedures. Uses controlled rupture operators to systematically handle incidents.

## Usage

```bash
/incident <type>
/incident analyze: <description>
/incident runbook: <scenario>
```

**Parameters:**

- `analyze: <description>`: Analyze incident from description
- `runbook: <scenario>`: Generate runbook for scenario

## What It Does

Applies controlled rupture operators:
- **Retro** (↶): Trace incident timeline
- **Ortho** (⊥): Correct issues
- **Telo** (→): Goal-directed recovery
- **Pro** (↷): Forward to resolution

## Examples

```bash
/incident analyze: API downtime
/incident runbook: Database connection failure
```

## Output

Provides:
- Incident analysis
- Root cause identification
- Recovery procedures
- Runbooks
- Post-mortem template

## When to Use

- Responding to incidents
- Creating runbooks
- Analyzing failures
- Improving reliability

## Related

- Use `/observability` for monitoring
- Use `/debug` for debugging
