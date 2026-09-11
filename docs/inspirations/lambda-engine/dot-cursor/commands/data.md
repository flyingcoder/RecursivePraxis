# /data Command - Data Model Designer

## Description

Designs data models, database schemas, and data structures. Uses controlled rupture operators to ensure data models are normalized, efficient, and handle relationships correctly.

## Usage

```bash
/data <entity or model>
/data model: <model name>
/data schema: <schema description>
/data design: <database design>
/data validate: <existing schema>
```

**Parameters:**

- `model: <name>`: Design data model for entity
- `schema: <description>`: Design database schema
- `design: <description>`: Design complete data architecture
- `validate: <description>`: Validate existing data model

## What It Does

Applies controlled rupture operators:
- **Axis** (📍): Establish data coordinate system
- **Weave** (🕸️): Integrate entities into schema
- **Bind** (🔗): Create cohesive data structure
- **Kata** (↓): Optimize and compress schema
- **Retro** (↶): Plan migrations and versioning

## Examples

```bash
/data model: User with authentication and profile
/data schema: E-commerce database with products, orders, and customers
/data design: Multi-tenant SaaS application with user isolation
/data validate: Current user management schema
```

## Output

Provides:
- Entity definitions (tables/collections with fields)
- Relationships (foreign keys, associations, cardinality)
- Constraints (primary keys, unique, check)
- Indexes for performance
- Data types and validations
- Migration scripts
- Query patterns
- Performance considerations

## When to Use

- Designing database schemas
- Creating data models
- Planning migrations
- Optimizing data structures
- Validating existing schemas

## Related

- Use `/api` for API data models
- Use `/spec` for general specifications
