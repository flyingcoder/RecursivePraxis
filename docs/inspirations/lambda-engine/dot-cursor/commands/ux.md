# /ux Command - User Experience Designer

## Description

Designs and validates user experiences, user flows, and interaction patterns. Uses controlled rupture operators to explore alternative designs, validate usability, and ensure accessibility.

## Usage

```bash
/ux <feature or flow>
/ux flow: <user flow description>
/ux feature: <feature name>
/ux validate: <design>
/ux accessibility: <component>
```

**Parameters:**

- `flow: <text>`: Design user flow for specific scenario
- `feature: <text>`: Design UX for feature
- `validate: <text>`: Validate existing UX design
- `accessibility: <text>`: Check accessibility of component/flow

## What It Does

Applies controlled rupture operators:
- **Para** (∥): Explore alternative user journeys
- **Braid** (🌀): Interweave user needs with constraints
- **Ortho** (⊥): Validate accessibility and usability
- **Weave** (🕸️): Integrate into cohesive design system

## Examples

```bash
/ux flow: User registration and onboarding
/ux feature: Dashboard with real-time data visualization
/ux validate: Checkout flow
/ux accessibility: Navigation menu component
```

## Output

Provides:
- User flows and journeys
- Wireframes and layouts
- Interaction patterns
- Accessibility checklist (WCAG compliance)
- Usability guidelines
- Edge cases (error states, empty states)
- Responsive design considerations
- Design tokens (colors, typography, spacing)

## When to Use

- Designing new user flows
- Validating existing designs
- Ensuring accessibility
- Creating interaction patterns
- Planning responsive layouts

## Related

- Use `/a11y` for detailed accessibility analysis
- Use `/spec` for technical specifications
