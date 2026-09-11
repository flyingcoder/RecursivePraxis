# /release Command - Release Planner

## Description

Plans and coordinates releases, managing versions, dependencies, and deployment. Uses controlled rupture operators to ensure smooth and reliable releases.

## Usage

```bash
/release <version>
/release plan: <version>
/release execute: <version>
```

**Parameters:**

- `plan: <version>`: Plan release for version
- `execute: <version>`: Execute release for version

## What It Does

Applies controlled rupture operators:
- **Telo** (→): Goal-directed release
- **Weave** (🕸️): Integrate release components
- **Ortho** (⊥): Validate release readiness
- **Latch** (🔒): Lock release state

## Examples

```bash
/release plan: 1.2.0
/release execute: 1.2.0
```

## Output

Provides:
- Release plan
- Version strategy
- Dependency updates
- Deployment checklist
- Rollback plan

## When to Use

- Planning releases
- Coordinating deployments
- Managing versions
- Ensuring quality

## Related

- Use `/changelog` for changelogs
- Use `/observability` for monitoring
