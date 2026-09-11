# /store-release Command - App Store Release Assistant

## Description

Assists with app store releases including metadata, screenshots, and compliance. Uses controlled rupture operators to ensure successful store releases.

## Usage

```bash
/store-release <platform>
/store-release prepare: <platform>
/store-release metadata: <app>
```

**Parameters:**

- `prepare: <platform>`: Prepare release for platform (iOS/Android)
- `metadata: <app>`: Generate store metadata

## What It Does

Applies controlled rupture operators:
- **Telo** (→): Goal-directed release
- **Weave** (🕸️): Integrate release components
- **Ortho** (⊥): Validate compliance
- **Latch** (🔒): Lock release state

## Examples

```bash
/store-release prepare: iOS
/store-release metadata: MyApp
```

## Output

Provides:
- Store metadata
- Screenshot requirements
- Compliance checklist
- Release checklist
- Submission guide

## When to Use

- App store releases
- Store compliance
- Release preparation
- Metadata creation

## Related

- Use `/release` for release planning
- Use `/changelog` for changelogs
