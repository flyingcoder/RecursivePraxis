# /secrets Command - Secrets Management

## Description

Manages secrets, API keys, and sensitive data securely. Uses controlled rupture operators to ensure proper secrets handling and prevent exposure.

## Usage

```bash
/secrets <action>
/secrets audit: <path>
/secrets rotate: <key-name>
```

**Parameters:**

- `audit: <path>`: Audit secrets in path
- `rotate: <name>`: Rotate secret

## What It Does

Applies controlled rupture operators:
- **Ortho** (⊥): Validate secrets security
- **Latch** (🔒): Lock secrets properly
- **Retro** (↶): Audit secret history
- **Non** (¬): Identify exposed secrets

## Examples

```bash
/secrets audit: src/
/secrets rotate: API_KEY
```

## Output

Provides:
- Secrets audit report
- Exposure identification
- Rotation procedures
- Best practices
- Security recommendations

## When to Use

- Auditing codebase
- Managing secrets
- Preventing exposure
- Compliance requirements

## Related

- Use `/threat` for threat analysis
- Use `/privacy` for privacy concerns
