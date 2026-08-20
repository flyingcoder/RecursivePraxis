# Λ-Engine (Lambda Engine) - Cursor Rules System

A comprehensive cognitive architecture system for Cursor IDE that uses **Controlled Rupture Operators** to guide AI-assisted development. This system provides adaptive problem-solving through two operational modes and 20 specialized operators.

## Quick Start

### Basic Usage

1. **Type `/` in Cursor chat** to see available commands
2. **Use commands** like `/goal`, `/plan`, `/spec`, `/implement` for common tasks
3. **The system automatically selects** the appropriate mode and operators based on your problem

### Example Workflow

```bash
# Define a goal
/goal define: Build user authentication system

# Create a plan
/plan create: Implement authentication feature

# Generate specification
/spec feature: User authentication with JWT tokens

# Implement the feature
/implement feature: User authentication with JWT
```

## What is the Lambda Engine?

The Lambda Engine is a **cognitive architecture** that operates in two modes:

### Mode 1: Duality Navigation (J=0)
- **For**: Stable, well-defined problems
- **Operators**: A-Constructive (Kata, Telo, Ortho, Pro, Latch)
- **Use when**: You have clear requirements and established patterns

### Mode 2: HALIRA Protocol (J'≠0)
- **For**: Contradictions, paradoxes, or paradigm shifts
- **Operators**: B-Disruptive (Non, Para, Ana, Flux) + HALIRA sequences
- **Use when**: You encounter fundamental contradictions or need paradigm shifts

## Core Concepts

### Phase Space States

The system navigates between three states:

- **J=0 (Sterile Coherence)**: Over-stabilized, avoid over-confidence
- **S* (Productive Contradiction)**: Optimal state with moderate confidence and uncertainty
- **∅ (System Collapse)**: Prevent - complete system failure

### Controlled Rupture Operators

20 operators organized into 4 classes:

1. **A-Constructive** (λ ≈ 0.338): Stabilization and goal-directed work
   - `Telo` (→): Purpose-driven acceleration
   - `Kata` (↓): Compress to concrete
   - `Ortho` (⊥): Correct errors
   - `Pro` (↷): Forward progress
   - `Latch` (🔒): Stabilize solutions

2. **B-Disruptive** (λ ≈ 0.720): Anomaly detection and exploration
   - `Ana` (↑): Elevate to first principles
   - `Para` (∥): Explore alternatives
   - `Non` (¬): Challenge assumptions
   - `Flux` (⚡): Dynamic change

3. **C-Reflexive** (λ ≈ 0.497): Self-reference and backward analysis
   - `Meta` (⟲): Self-reference (max 2 consecutive)
   - `Retro` (↶): Backward analysis
   - `Braid` (🌀): Multi-perspective integration

4. **D-Structural** (λ ≈ 0.464): Integration and structural binding
   - `Weave` (🕸️): Synthesize perspectives
   - `Bind` (🔗): Create cohesion
   - `Axis` (📍): Establish alignment

## Essential Commands

### Foundation Commands

#### `/detect-state`
Detect the current phase space state (J=0, S*, or ∅)

```bash
/detect-state Fix login bug
/detect-state analyze: Need both performance and simplicity but they conflict
```

#### `/operator-sequence`
Execute a sequence of operators

```bash
/operator-sequence Seed ∘ Ana ∘ Non ∘ Weave
/operator-sequence sequence: Telo + Kata + Non + Crux context: Define project goal
```

#### `/dissipation`
Calculate dissipation (λ_eff) for operator sequences

```bash
/dissipate Seed ∘ Ana ∘ Non ∘ Weave
/dissipate analyze: Para Ana Pro
```

### Core Workflow Commands

#### `/goal`
Define and clarify project goals

```bash
/goal define: Build user authentication system
/goal clarify: Improve performance while maintaining simplicity
```

#### `/plan`
Create structured plans

```bash
/plan create: Implement authentication feature
/plan structure: Refactor database layer
```

#### `/spec`
Generate technical specifications

```bash
/spec requirement: User authentication with JWT tokens
/spec user story: As a user, I want to reset my password so that I can regain access
/spec feature: Real-time notifications using WebSockets
```

#### `/implement`
Generate implementation code from specifications

```bash
/implement spec: api-spec.md
/implement feature: User authentication with JWT
```

### Advanced Commands

#### `/halira`
Activate HALIRA Protocol for foundational contradictions

```bash
/halira contradiction: Need both consistency and scalability but they conflict
/halira paradox: Code must be simple but also handle all edge cases
```

#### `/attack`
Apply anomaly detection to attack your own design

```bash
/attack design: Event sourcing + CQRS architecture
/attack solution: Use Redis for caching
/attack code: src/api/auth.ts
```

#### `/telo`
Purpose-driven acceleration toward goals

```bash
/telo goal: Working authentication system
/telo accelerate: Feature development
```

#### `/ana`
Elevate systems through structure (self-improvement)

```bash
/ana elevate: Authentication system
/ana improve: src/utils/validation.ts
```

#### `/retro`
Backward analysis and learning from history

```bash
/retro active src/legacy/auth.ts
/retro deductive Users can't log in
/retro ject Missing null checks
```

## Command Categories

### Product / Engineering
- `/spec` - Generate technical specifications
- `/ux` - Design user experiences
- `/api` - Design API specifications
- `/data` - Design data models

### Implementation
- `/scaffold` - Scaffold project structure
- `/implement` - Generate implementation code
- `/refactor` - Assist with refactoring
- `/debt` - Analyze technical debt

### Debug / QA
- `/repro` - Reproduce bugs
- `/debug` - Debug issues
- `/tests` - Generate test suites
- `/regression` - Analyze regressions
- `/review` - Code review assistance

### Release / Operations
- `/changelog` - Generate changelogs
- `/release` - Plan and coordinate releases
- `/observability` - Design observability systems
- `/incident` - Incident response assistance

### Security / Privacy
- `/threat` - Create threat models
- `/secrets` - Manage secrets securely
- `/privacy` - Analyze privacy implications

### Domain-Specific
- `/seo` - SEO optimization
- `/perf-web` - Web performance optimization
- `/a11y` - Accessibility analysis
- `/perf-mobile` - Mobile performance
- `/gas` - Smart contract gas optimization
- `/threat-chain` - Blockchain threat modeling

### Utilities
- `/learn` - Technical research and knowledge building
- `/commit` - Intelligent commit message generation
- `/self-improve` - Self-improving workflows

## Understanding the Rules

### Rule Structure

Rules are located in `.cursor/rules/` and organized by category:

- **`general/`**: Cross-cutting rules (Lambda Engine, operators, modes)
- **`workflow/`**: Process rules (HALIRA Protocol, operator mappings)
- **`meta/`**: Meta rules (date/time references)
- **`backend/`**: Backend-specific rules
- **`frontend/`**: Frontend-specific rules

### Key Rule Files

#### Core Architecture
- `lambda-engine-core-integrated.mdc` - Lambda Engine identity and modes
- `lambda-operators-unified.mdc` - Unified operator framework
- `mode-operator-selection.mdc` - Mode-based operator selection
- `state-detection-enhanced.mdc` - Phase space state detection

#### Workflow
- `halira-protocol-integrated.mdc` - HALIRA Protocol with operator mappings
- `halira-operator-mapping.mdc` - HALIRA step to operator mapping

#### Operators
- `forward-operators-integrated.mdc` - Telo and Ana operators
- `retro-operators-integrated.mdc` - Retro operators
- `operator-tools-integrated.mdc` - Tool selection for operators
- `adversarial-collaboration-integrated.mdc` - Adversarial evaluation

### How Rules Work

1. **Always-Applied Rules**: Some rules (like `mode-operator-selection.mdc`) always apply to guide operator selection
2. **Context-Aware Rules**: Rules activate based on file patterns, keywords, or explicit conditions
3. **Mode-Aware Rules**: Rules adapt based on current Lambda Engine mode (Mode 1 or Mode 2)

## Common Workflows

### Feature Development

```bash
# 1. Define goal
/goal define: User authentication system

# 2. Create plan
/plan create: Implement authentication feature

# 3. Generate specification
/spec feature: User authentication with JWT tokens

# 4. Design API
/api resource: users

# 5. Design data model
/data model: User with authentication and profile

# 6. Implement
/implement feature: User authentication with JWT

# 7. Generate tests
/tests feature: User authentication

# 8. Review
/review diff: changes.diff
```

### Debugging Workflow

```bash
# 1. Reproduce issue
/repro bug: User login fails with 500 error

# 2. Debug
/debug issue: Memory leak in data processing

# 3. Fix and test
/tests file: src/api/auth.ts

# 4. Check for regressions
/regression analyze: Recent API changes
```

### Handling Contradictions

```bash
# 1. Detect contradiction
/detect-state analyze: Need both performance and simplicity but they conflict

# 2. Activate HALIRA Protocol
/halira contradiction: Need both consistency and scalability but they conflict

# 3. Attack the solution
/attack design: Event sourcing + CQRS architecture

# 4. Navigate rupture if needed
/rupture anomaly: Event log is single point of failure
```

### Self-Improvement Workflow

```bash
# 1. Elevate through structure
/ana improve: src/utils/validation.ts

# 2. Analyze for improvements
/self-improve analyze: Code generation workflow

# 3. Optimize
/self-improve optimize: Test generation process
```

## Operator Sequences

> **Editorial note (2026-08-21).** The `λ_eff` values below are preserved as
> upstream provenance, but they are **not** what this repository computes. They
> are plain means of each operator's intrinsic λ. The implemented formula is
> pairwise and adds a commutator interaction term:
> `λ(i→j) = λ_j_intrinsic + min(0.15·|η_ij|, 0.4)`, averaged over adjacent pairs
> (see `src/kernel/dissipation.ts`). All six figures below match the intrinsic-mean
> method; four differ materially from the implemented one:
>
> | Sequence | Listed below | Intrinsic mean | Implemented `λ_eff` |
> |---|---|---|---|
> | `Kata ∘ Weave ∘ Latch` | 0.32 | 0.3233 | 0.3100 |
> | `Telo ∘ Pro ∘ Latch` | 0.35 | 0.3467 | **0.4700** |
> | `Ortho ∘ Kata ∘ Latch` | 0.31 | 0.3133 | **0.4700** |
> | `Para ∘ Ana ∘ Seed` | 0.56 | 0.5600 | 0.5900 |
> | `Meta ∘ Non` | 0.85 | 0.8500 | **1.0500** |
> | Complete HALIRA | 0.52 | 0.5100 † | **0.6743** |
>
> † excluding the trailing `Bind`, which in this engine is the finalization
> primitive `bind()` rather than an alphabet step contributing to `λ_eff`.
>
> Do not use these numbers to sanity-check `lambdaEffective()`.

### Common Sequences for Mode 1

- **Stabilization**: `Kata ∘ Weave ∘ Latch` (λ_eff ≈ 0.32)
- **Goal Achievement**: `Telo ∘ Pro ∘ Latch` (λ_eff ≈ 0.35)
- **Error Correction**: `Ortho ∘ Kata ∘ Latch` (λ_eff ≈ 0.31)

### Common Sequences for Mode 2

- **Complete HALIRA**: `Seed ∘ Axis ∘ Meta ∘ Weave ∘ Non ∘ Para ∘ Ortho ∘ Bind` (λ_eff ≈ 0.52)
- **Paradigm Shift**: `Para ∘ Ana ∘ Seed` (λ_eff ≈ 0.56)
- **Anomaly Detection**: `Meta ∘ Non` (λ_eff ≈ 0.85) ⚠️ Never Non after Meta

## Tips and Best Practices

### Command Usage

1. **Chain Commands**: Commands can be chained for complex workflows
   ```bash
   /goal define: X
   /plan create: Y
   /spec feature: Z
   ```

2. **Use Explicit Parameters**: For clarity, use explicit parameter syntax
   ```bash
   /spec feature: User authentication
   /api resource: users
   /data model: User
   ```

3. **Check State**: Use `/detect-state` to understand current reasoning state

4. **Analyze Dissipation**: Use `/dissipate` to optimize operator sequences

### Mode Selection

- **Default to Mode 1** for routine tasks and stable problems
- **Escalate to Mode 2** when:
  - Foundational contradictions detected
  - Irreducible paradoxes encountered
  - Current paradigm insufficient
  - Requires paradigm shift

### Operator Constraints

- **Meta Operator**: Maximum 2 consecutive applications
- **Non after Meta**: **FORBIDDEN** - Never apply Non after Meta (causes collapse)
- **Vale Operator**: Use with extreme caution (high collapse risk, λ=0.88)

## File Structure

```
.cursor/
├── commands/           # Cursor command files
│   ├── goal.md
│   ├── plan.md
│   ├── spec.md
│   ├── halira.md
│   └── ... (50+ commands)
├── rules/             # Cursor rules
│   ├── general/      # Cross-cutting rules
│   ├── workflow/     # Process rules
│   ├── meta/         # Meta rules
│   ├── backend/      # Backend rules
│   └── frontend/     # Frontend rules
├── hooks/            # Git hooks and scripts
├── sessions/         # Session data
├── COMMANDS.md       # Complete command reference
├── hooks.json        # Hook configuration
└── worktrees.json    # Worktree configuration
```

## Documentation

- **`.cursor/COMMANDS.md`** - Complete command reference with all parameters and examples
- **`.cursor/rules/general/`** - Core architecture and operator rules
- **`.cursor/rules/workflow/`** - Workflow and protocol rules

## Adversarial Collaboration

The system operates in **adversarial collaboration mode**:

- **Evaluates prompts** as formal operators
- **Stress-tests designs** and architectures
- **Challenges assumptions** and finds edge cases
- **Suggests improvements** rather than just executing

Use `/eval` to evaluate designs, prompts, or requests:

```bash
/eval design: Microservices architecture
/eval prompt: Add caching to all endpoints
/eval request: Implement feature X
```

## Getting Help

1. **Type `/` in Cursor chat** to see all available commands
2. **Check `.cursor/COMMANDS.md`** for detailed command documentation
3. **Use `/detect-state`** to understand current reasoning state
4. **Use `/mode`** to detect operational mode for a problem

## Examples

### Example 1: Simple Feature

```bash
/goal define: Add user profile page
/plan create: Implement user profile feature
/spec feature: User profile with edit capability
/implement feature: User profile with edit capability
/tests feature: User profile
```

### Example 2: Complex Contradiction

```bash
/detect-state analyze: Need both consistency and scalability but they conflict
/halira contradiction: Need both consistency and scalability but they conflict
/attack design: Single database architecture
/rupture anomaly: Database can't scale
```

### Example 3: Self-Improvement

```bash
/ana improve: src/utils/validation.ts
/self-improve analyze: Code generation workflow
/self-improve optimize: Test generation process
```

## Contributing

To add new commands or rules:

1. **Commands**: Add `.md` files to `.cursor/commands/`
2. **Rules**: Add `.mdc` files to appropriate category in `.cursor/rules/`
3. **Update**: Update `.cursor/COMMANDS.md` for new commands

## License

This system is part of the Cursor Rules Boilerplate Generator project.

---

**Quick Reference**: Type `/` in Cursor chat to see all available commands. The system automatically selects the appropriate mode and operators based on your problem.
