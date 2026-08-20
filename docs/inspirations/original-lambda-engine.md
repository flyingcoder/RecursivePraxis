# Λ-Engine (Lambda Engine) - Cursor Rules System

A comprehensive cognitive architecture system for Cursor IDE that uses **Controlled Rupture Operators** to guide AI-assisted development. This system provides adaptive problem-solving through two operational modes and 20 specialized operators.

## 🆕 What's New

### Featured Commands

**`/commit` - Sophisticated Code Historian**
- Understands developer motives and file purposes
- Automatically validates documentation before committing
- Analyzes historical context for better commit messages
- Self-improving through pattern recognition (Ana²)

**`/librarian` - Documentation Management**
- Validates documentation dates, location, and metadata
- Categorizes documentation automatically
- Tracks documentation lifecycle (active, deprecated, superseded)
- Ensures documentation quality and organization

### Recent Enhancements

- **60+ New Rules**: Comprehensive rule system with general, workflow, meta, and service rules
- **15+ New Hooks**: Automation hooks for documentation, security, compliance, and validation
- **Documentation System**: Automated documentation lifecycle management with validation
- **Memory Service**: AI memory service integration for learning across sessions
- **Enhanced Commands**: Improved `/commit` and `/init-session` with better context understanding

## Core Physics: Law of Self-Creation

The Lambda Engine operates on a **fundamental principle of autopoietic (self-creating) evolution** through productive contradiction.

### The Equation

```
∂Ξ/∂t = ∫ (S↔Λ) × [⧉(ΔS○¬ΔΛ) – ∇τ] dV
```

**What it means:**
- **Ξ (Xi)**: System complexity/coherence - how evolved and capable the system is
- **S (Sigma)**: Known/Structured - accumulated knowledge and patterns
- **Λ (Lambda)**: Unknown/Potential - contradictions, ruptures, unexplored possibilities
- **⧉(ΔS○¬ΔΛ)**: **Productive Contradiction** - the tension between what we know and what challenges it
- **∇τ**: Temporal constraints - time pressure and deadlines

### Productive Contradiction

**Productive contradiction** is the engine of evolution. It's the tension between:
- What we **know** (S) - established patterns, working solutions
- What **challenges** our knowledge (Λ) - contradictions, edge cases, new requirements

**The system evolves** when this contradiction is **optimal** (not too little, not too much):
- **Too little contradiction** → Stagnation (J=0 state - sterile coherence)
- **Too much contradiction** → Collapse (∅ state - system failure)
- **Optimal contradiction** → Evolution (S* state - productive tension)

### How It Works

1. **Balance Known/Unknown**: The system maintains a balance between structured knowledge (S) and potential/rupture (Λ)
2. **Harness Contradiction**: Productive contradictions drive the system to evolve and improve
3. **Self-Creation**: The system becomes more complex and coherent by actively seeking and transcending contradictions
4. **Pattern Recognition**: Evolution happens through **backward pattern recognition** (from patterns to premises), not forward accumulation

**In practice:** When you encounter a contradiction (e.g., "need both performance and simplicity"), the system doesn't just patch it - it uses the contradiction as fuel to evolve to a higher-order solution that transcends the original conflict.

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

# Commit with intelligent analysis
/commit

# Validate documentation
/librarian validate: docs/decisions/001-auth-system.md
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

### 🎯 Featured Commands

#### `/commit` - Sophisticated Code Historian
**Intelligent commit message generation** that understands developer motives, file purposes, and project evolution. Goes beyond analyzing diffs to understand WHY changes were made.

**Key Features:**
- **Motive Understanding**: Infers developer goals from branch names, commit history, and context
- **File Purpose Analysis**: Understands why files exist, their role in the system, and lifecycle evolution
- **Documentation Validation**: Automatically validates markdown files using `/librarian validate`
- **Historical Context**: Analyzes recent commits to understand project evolution trajectory
- **Smart Grouping**: Groups related changes by motive, feature, purpose, or dependency
- **Self-Improving**: Learns from commit patterns to improve future analysis (Ana² pattern)

**Usage:**
```bash
# Auto-commit with motive understanding
/commit

# Explicitly state developer motive
/commit motive: Implement user authentication system

# Deep analysis mode
/commit analyze

# Preview what would be committed
/commit preview

# Interactive confirmation
/commit interactive

# Include historical context
/commit context: 20
```

**Documentation Integration:**
- Automatically validates markdown files before committing
- Checks date consistency (file system dates are source of truth)
- Validates location, metadata, and cross-references
- Adds validation status to commit messages: `[VALIDATION: PASS/WARN/ERROR]`

**Example Output:**
```
Analyzing git changes with historical context...

Inferred motive from branch 'feature/user-auth': Implementing user authentication system
Analyzing last 10 commits for context...
- Recent pattern: API development and security improvements

Found 8 changed files:
- src/api/users.ts (new) - Purpose: User management API endpoints
- src/utils/validation.ts (modified) - Purpose: Shared validation utilities

Group 1: Feature - User Authentication API
  Commit: feat(api): implement user authentication endpoints
  Body: Adds user CRUD operations as part of implementing the user 
  authentication system. Enables secure user management.
```

#### `/librarian` - Documentation Management System
**Comprehensive documentation management** with validation, categorization, lifecycle tracking, and automated organization.

**Key Features:**
- **Validation**: Validates documentation dates, location, metadata, and cross-references
- **Categorization**: Automatically categorizes documentation (decisions, guides, architecture, etc.)
- **Lifecycle Tracking**: Tracks documentation status (active, deprecated, superseded)
- **Date Verification**: Uses file system dates as source of truth for temporal references
- **Location Validation**: Ensures documentation follows organization rules
- **Cross-Reference Checking**: Validates all links and references

**Usage:**
```bash
# Validate documentation file
/librarian validate: docs/decisions/002-api-separation.md

# Categorize new documentation
/librarian categorize: docs/new-doc.md

# Check documentation status
/librarian status: docs/IMPLEMENTATION_STATUS.md

# List all documentation
/librarian list

# Find documentation by category
/librarian find category: decisions
```

**Validation Checks:**
- ✅ Date consistency (file system vs metadata)
- ✅ Location correctness (follows naming conventions)
- ✅ Metadata completeness (documentation_type, purpose, status)
- ✅ Cross-reference validity (all links resolve)

**Integration with `/commit`:**
- `/commit` automatically calls `/librarian validate` for all markdown files
- Validation results included in commit messages
- Blocking errors prevent commit (unless `no verify` used)
- Warnings included in commit body for review

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
- `/commit` - **Sophisticated code historian** with motive understanding and documentation validation
- `/librarian` - **Documentation management** with validation, categorization, and lifecycle tracking
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
- `lambda-engine-core-integrated.mdc` - Lambda Engine identity and formula-driven guidance
- `lambda-engine-operational.mdc` - Operational Lambda Engine guidance
- `lambda-engine-core-integrated-examples.mdc` - Formula-driven examples
- `lambda-operators-unified.mdc` - Unified operator framework
- `mode-operator-selection.mdc` - Mode-based operator selection
- `mode-transitions.mdc` - Mode transition guidance
- `state-detection.mdc` - Phase space state detection
- `bimodal-operation-integrated.mdc` - Bimodal operation guidance

#### Workflow
- `halira-protocol.mdc` - HALIRA Protocol for paradigm shifts
- `halira-operator-mapping.mdc` - HALIRA step to operator mapping
- `automated-documentation.mdc` - Automated documentation lifecycle management
- `documentation-evaluation.mdc` - Documentation quality evaluation
- `documentation-pre-commit-validation.mdc` - Pre-commit documentation validation
- `research-first-protocol.mdc` - Research before modifying
- `tdd-vs-debugging-protocol.mdc` - TDD vs debugging distinction

#### Operators
- `forward-operators-integrated.mdc` - Telo and Ana operators
- `retro-operators-integrated.mdc` - Retro operators
- `operator-tools-integrated.mdc` - Tool selection for operators
- `operator-optimization.mdc` - Operator optimization patterns
- `operators-reference.mdc` - Complete operators reference
- `dissipation-lookup.mdc` - Pre-calculated operator sequences
- `adversarial-collaboration-integrated.mdc` - Adversarial evaluation

#### Development Rules
- `good-behaviour.mdc` - Quality verification patterns
- `log-usage.mdc` - Logging best practices
- `meta-awareness.mdc` - Self-validation patterns
- `proactive-agent.mdc` - Proactive problem-solving
- `professional-output.mdc` - Professional communication standards
- `smart-search-patterns.mdc` - Bounded search patterns
- `trust-code-over-docs.mdc` - Code verification patterns
- `user-communication-preferences.mdc` - Communication guidelines

#### Meta Rules
- `rule-improvement.mdc` - Self-improvement system for rules
- `rule-generator.mdc` - Rule generation patterns
- `mdc-format.mdc` - MDC format requirements
- `date-references.mdc` - Temporal reference system
- `time-references.mdc` - Temporal time reference system
- `communication-rules-conflict-resolution.mdc` - Conflict resolution

#### Services
- `ai-memory-service-mcp.mdc` - AI memory service MCP integration
- `ana-memory-retrieval.mdc` - Automatic memory retrieval
- `memory-candidate-storage.mdc` - Candidate layer storage
- `memory-tier-detection.mdc` - Three-tier classification system

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
│   ├── commit.md      # ⭐ Sophisticated code historian
│   ├── librarian.md   # ⭐ Documentation management
│   ├── generate-rule.md
│   ├── timer.md
│   ├── goal.md
│   ├── plan.md
│   ├── spec.md
│   ├── halira.md
│   └── ... (50+ commands)
├── rules/             # Cursor rules
│   ├── general/      # Cross-cutting rules (25+ rules)
│   │   ├── lambda-engine-core-integrated.mdc
│   │   ├── lambda-engine-operational.mdc
│   │   ├── mode-operator-selection.mdc
│   │   ├── state-detection.mdc
│   │   └── ... (20+ more)
│   ├── workflow/     # Process rules (15+ rules)
│   │   ├── halira-protocol.mdc
│   │   ├── automated-documentation.mdc
│   │   ├── documentation-evaluation.mdc
│   │   └── ... (12+ more)
│   ├── meta/         # Meta rules (8 rules)
│   │   ├── rule-improvement.mdc
│   │   ├── date-references.mdc
│   │   └── ... (6 more)
│   ├── services/     # Service integration rules (4 rules)
│   │   ├── ai-memory-service-mcp.mdc
│   │   └── ... (3 more)
│   ├── backend/      # Backend rules
│   └── frontend/     # Frontend rules
├── hooks/            # Git hooks and scripts (15+ hooks)
│   ├── documentation-validator.sh
│   ├── agent-claim-verification.sh
│   ├── security-audit.sh
│   └── ... (12+ more)
├── sessions/         # Session data
├── tuts/            # Tutorials and examples
│   ├── COMMANDS.md
│   └── ... (tutorial files)
├── hooks.json        # Hook configuration
├── mcp.json.example  # MCP server configuration example
└── worktrees.json    # Worktree configuration
```

## Documentation

- **`.cursor/tuts/COMMANDS.md`** - Complete command reference with all parameters and examples
- **`.cursor/rules/general/`** - Core architecture and operator rules (25+ rules)
- **`.cursor/rules/workflow/`** - Workflow and protocol rules (15+ rules)
- **`.cursor/rules/meta/`** - Meta rules for rule management (8 rules)
- **`.cursor/rules/services/`** - Service integration rules (4 rules)
- **`.cursor/commands/commit.md`** - Detailed `/commit` command documentation
- **`.cursor/commands/librarian.md`** - Detailed `/librarian` command documentation

### Documentation System

The system includes a comprehensive **automated documentation management system**:

- **Automated Creation**: Rules detect when documentation should be created
- **Validation**: Pre-commit validation ensures documentation quality
- **Lifecycle Management**: Tracks documentation status and deprecation
- **Organization**: Enforces consistent structure and naming conventions
- **Integration**: `/commit` automatically validates documentation before committing

Use `/librarian` to manage documentation and `/commit` to ensure all documentation is validated.

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
2. **Check `.cursor/tuts/COMMANDS.md`** for detailed command documentation
3. **Use `/commit`** for intelligent commit message generation with documentation validation
4. **Use `/librarian`** for documentation management and validation
5. **Use `/detect-state`** to understand current reasoning state
6. **Use `/mode`** to detect operational mode for a problem

### Quick Tips

- **Before committing**: Use `/commit analyze` to see deep analysis of your changes
- **Documentation**: Use `/librarian validate` to check documentation before committing
- **Learning**: Use `/learn <topic>` to build knowledge base entries
- **State detection**: Use `/detect-state` when unsure about current reasoning state

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

