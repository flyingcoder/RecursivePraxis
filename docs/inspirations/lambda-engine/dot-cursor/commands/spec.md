# /spec Command - Specification Generator

## Description

Generates comprehensive technical specifications from requirements, user stories, or feature descriptions. Uses controlled rupture operators to ensure specifications are complete, consistent, and handle edge cases.

## Usage

```bash
/spec <requirement>
/spec requirement: <description>
/spec user story: <story>
/spec feature: <feature description>
/spec from: <file-path>
```

**Parameters:**

- `requirement`: The requirement or feature to specify
- `requirement: <text>`: Explicit requirement description
- `user story: <text>`: User story format (As a... I want... So that...)
- `feature: <text>`: Feature description
- `from: <path>`: Read requirement from file

## What It Does

Applies controlled rupture operators:
- **Ana** (↑): Abstract requirements into formal structure
- **Weave** (🕸️): Integrate requirements into coherent specification
- **Ortho** (⊥): Validate and correct specification
- **Kata** (↓): Compress into structured output

## Examples

```bash
/spec requirement: User authentication with JWT tokens
/spec user story: As a user, I want to reset my password so that I can regain access
/spec feature: Real-time notifications using WebSockets
```

## Output

Provides:
- Overview and goals
- Functional and non-functional requirements
- API specifications and contracts
- Data models and schemas
- Behavior specifications
- Edge cases and error handling
- Acceptance criteria
- Dependencies and security considerations

## When to Use

- Starting new feature development
- Documenting requirements
- Creating API contracts
- Defining data models
- Establishing acceptance criteria

## Related

- Use `/api` for API-specific specifications
- Use `/data` for data model specifications
- Use `/ux` for user experience specifications
