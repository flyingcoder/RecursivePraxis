# /api Command - API Specification Generator

## Description

Generates comprehensive API specifications including endpoints, request/response schemas, authentication, error handling, and documentation. Uses controlled rupture operators to ensure APIs are well-designed, consistent, and handle edge cases.

## Usage

```bash
/api <resource or endpoint>
/api resource: <resource name>
/api endpoint: <endpoint description>
/api design: <API description>
/api validate: <existing API>
```

**Parameters:**

- `resource: <name>`: Design API for resource (e.g., users, orders)
- `endpoint: <description>`: Design specific endpoint
- `design: <description>`: Design complete API
- `validate: <description>`: Validate existing API design

## What It Does

Applies controlled rupture operators:
- **Seed** (🌱): Establish API foundation
- **Weave** (🕸️): Integrate schemas and endpoints
- **Bind** (🔗): Create cohesive API structure
- **Ortho** (⊥): Validate and correct API design
- **Kata** (↓): Compress into OpenAPI format

## Examples

```bash
/api resource: users
/api endpoint: POST /users/{id}/reset-password
/api design: E-commerce API with products, orders, and payments
/api validate: REST API for user management
```

## Output

Provides:
- Base URL and versioning strategy
- Authentication methods
- Complete endpoint definitions (method, path, params, schemas)
- Request/response schemas (JSON Schema, TypeScript types)
- Error handling and status codes
- Data models
- Rate limiting and pagination
- OpenAPI/Swagger specification
- Request/response examples

## When to Use

- Designing new APIs
- Documenting existing APIs
- Validating API consistency
- Creating API contracts
- Generating OpenAPI specs

## Related

- Use `/spec` for general specifications
- Use `/data` for data model specifications
- Use `/threat` for API security analysis
