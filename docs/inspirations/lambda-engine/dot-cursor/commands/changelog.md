# /changelog Command - Changelog Generator

## Description

Generates changelogs from git history, commit messages, and changes. Uses controlled rupture operators to create comprehensive and well-organized changelogs.

## Usage

```bash
/changelog <scope>
/changelog version: <version>
/changelog since: <tag>
```

**Parameters:**

- `version: <version>`: Generate changelog for version
- `since: <tag>`: Generate changelog since tag

## What It Does

Applies controlled rupture operators:
- **Retro** (↶): Analyze commit history
- **Weave** (🕸️): Integrate changes
- **Kata** (↓): Compress to changelog format
- **Echo** (🔊): Replicate changelog patterns

## Examples

```bash
/changelog version: 1.2.0
/changelog since: v1.1.0
```

## Output

Provides:
- Changelog entries
- Categorized changes
- Version information
- Release notes

## When to Use

- Preparing releases
- Documenting changes
- Creating release notes
- Tracking versions

## Related

- Use `/release` for release planning
- Use `/commit` for commit analysis
