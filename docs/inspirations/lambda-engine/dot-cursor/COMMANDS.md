# Λ-Engine Commands Usage Guide

Complete reference for all Λ-Engine commands with usage examples and parameters.

**Quick Start:** Type `/` followed by command name in Cursor chat. Commands use Controlled Rupture Operators to transform problem states.

---

## Foundation

### `/operator-sequence`

Executes a sequence of Controlled Rupture operators to transform a problem state. Applies operators in order, tracking dissipation and state transitions.

**Usage:**
```bash
/operator-sequence <sequence> [context]
```
```bash
/operator-sequence sequence: <operators> [context: <description>]
```

**Examples:**
```bash
/operator-sequence Seed ∘ Ana ∘ Non ∘ Weave
```
```bash
/operator-sequence sequence: Telo + Kata + Non + Crux context: Define project goal
```

---

### `/detect-state`

Detects the current phase space state (J=0, S*, or ∅) by analyzing problem characteristics, contradictions, and system dynamics.

**Usage:**
```bash
/detect-state [problem]
```
```bash
/detect-state analyze: <description>
```
```bash
/detect-state check: <context>
```

**Examples:**
```bash
/detect-state Fix login bug
```
```bash
/detect-state analyze: Need both performance and simplicity but they conflict
```

---

### `/dissipation`

Calculates and analyzes dissipation (λ_eff) for operator sequences. Provides detailed dissipation analysis, trajectory prediction, and optimization recommendations.

**Usage:**
```bash
/dissipate <sequence>
```
```bash
/dissipate sequence: <operators>
```
```bash
/dissipate analyze: <sequence> [options]
```

**Examples:**
```bash
/dissipate Seed ∘ Ana ∘ Non ∘ Weave
```
```bash
/dissipate Vale ∘ Non ∘ Para
```

---

## Core

### `/goal`

Defines and clarifies project goals using purpose-driven compression, contradiction analysis, and critical decision points.

**Usage:**
```bash
/goal [description]
```
```bash
/goal define: <goal description>
```
```bash
/goal clarify: <unclear goal>
```

**Parameters:**
- `description`: The goal to define or clarify
- `define: <text>`: Explicitly define a new goal
- `clarify: <text>`: Clarify an unclear or ambiguous goal

**Examples:**
```bash
/goal define: Build user authentication system
```
```bash
/goal clarify: Improve performance while maintaining simplicity
```

---

### `/plan`

Creates structured plans by forward progression, alignment, critical analysis, dynamic adaptation, and stabilization.

**Usage:**
```bash
/plan [task]
```
```bash
/plan create: <task description>
```
```bash
/plan structure: <project>
```

**Parameters:**
- `task`: The task or project to plan
- `create: <text>`: Create plan for task
- `structure: <text>`: Structure plan for project

**Examples:**
```bash
/plan create: Implement authentication feature
```
```bash
/plan structure: Refactor database layer
```

---

### `/scope`

Determines project scope through abstraction, parallel exploration, contradiction analysis, correction, and deep exploration.

**Usage:**
```bash
**Parameters:**
```
```bash
- `project`: The project to scope
```
```bash
- `determine: <text>`: Determine scope for project
```
```bash
- `analyze: <text>`: Analyze scope boundaries
```
```bash
- `project`: The project to scope
```
```bash
- `determine: <text>`: Determine scope for project
```
```bash
- `analyze: <text>`: Analyze scope boundaries
```
```bash
/scope [project]
```
```bash
/scope determine: <project description>
```
```bash
/scope analyze: <feature>
```

**Parameters:**
- `project`: The project to scope
- `determine: <text>`: Determine scope for project
- `analyze: <text>`: Analyze scope boundaries
- `project`: The project to scope
- `determine: <text>`: Determine scope for project

**Examples:**
```bash
/scope determine: User management system
```
```bash
/scope analyze: Authentication feature boundaries
```

---

### `/status`

Reports current project status through self-reflection, dynamic analysis, forward assessment, and critical evaluation.

**Usage:**
```bash
**Parameters:**
```
```bash
- `project`: The project to check
```
```bash
- `check: <text>`: Check status of component
```
```bash
- `report: <text>`: Generate status report
```
```bash
- `project`: The project to check
```
```bash
- `check: <text>`: Check status of component
```
```bash
- `report: <text>`: Generate status report
```
```bash
/status [project]
```
```bash
/status check: <component>
```
```bash
/status report: <feature>
```

**Parameters:**
- `project`: The project to check
- `check: <text>`: Check status of component
- `report: <text>`: Generate status report
- `project`: The project to check
- `check: <text>`: Check status of component

**Examples:**
```bash
/status check: Authentication feature
```
```bash
/status report: Database migration progress
```

---

### `/decide`

Makes decisions through abstraction, parallel options, critical analysis, alignment, and stabilization.

**Usage:**
```bash
**Parameters:**
```
```bash
- `decision`: The decision to make
```
```bash
- `choose: <text>`: Choose between options
```
```bash
- `evaluate: <text>`: Evaluate alternatives
```
```bash
- `decision`: The decision to make
```
```bash
- `choose: <text>`: Choose between options
```
```bash
- `evaluate: <text>`: Evaluate alternatives
```
```bash
/decide [decision]
```
```bash
/decide choose: <options>
```
```bash
/decide evaluate: <alternatives>
```

**Parameters:**
- `decision`: The decision to make
- `choose: <text>`: Choose between options
- `evaluate: <text>`: Evaluate alternatives
- `decision`: The decision to make
- `choose: <text>`: Choose between options

**Examples:**
```bash
/decide choose: Database technology (PostgreSQL vs MongoDB)
```
```bash
/decide evaluate: Authentication approach (JWT vs OAuth)
```

---

## Product / Eng

### `/spec`

Generates comprehensive technical specifications from requirements, user stories, or feature descriptions. Uses controlled rupture operators to ensure specifications are complete, consistent, and handle edge cases.

**Usage:**
```bash
/spec <requirement>
```
```bash
/spec requirement: <description>
```
```bash
/spec user story: <story>
```
```bash
/spec feature: <feature description>
```
```bash
/spec from: <file-path>
```

**Parameters:**
- `requirement`: The requirement or feature to specify
- `requirement: <text>`: Explicit requirement description
- `user story: <text>`: User story format (As a... I want... So that...)
- `feature: <text>`: Feature description
- `from: <path>`: Read requirement from file

**Examples:**
```bash
/spec requirement: User authentication with JWT tokens
```
```bash
/spec user story: As a user, I want to reset my password so that I can regain access
```
```bash
/spec feature: Real-time notifications using WebSockets
```

---

### `/ux`

Designs and validates user experiences, user flows, and interaction patterns. Uses controlled rupture operators to explore alternative designs, validate usability, and ensure accessibility.

**Usage:**
```bash
/ux <feature or flow>
```
```bash
/ux flow: <user flow description>
```
```bash
/ux feature: <feature name>
```
```bash
/ux validate: <design>
```
```bash
/ux accessibility: <component>
```

**Parameters:**
- `flow: <text>`: Design user flow for specific scenario
- `feature: <text>`: Design UX for feature
- `validate: <text>`: Validate existing UX design
- `accessibility: <text>`: Check accessibility of component/flow

**Examples:**
```bash
/ux flow: User registration and onboarding
```
```bash
/ux feature: Dashboard with real-time data visualization
```
```bash
/ux validate: Checkout flow
```

---

### `/api`

Generates comprehensive API specifications including endpoints, request/response schemas, authentication, error handling, and documentation. Uses controlled rupture operators to ensure APIs are well-designed, consistent, and handle edge cases.

**Usage:**
```bash
/api <resource or endpoint>
```
```bash
/api resource: <resource name>
```
```bash
/api endpoint: <endpoint description>
```
```bash
/api design: <API description>
```
```bash
/api validate: <existing API>
```

**Parameters:**
- `resource: <name>`: Design API for resource (e.g., users, orders)
- `endpoint: <description>`: Design specific endpoint
- `design: <description>`: Design complete API
- `validate: <description>`: Validate existing API design

**Examples:**
```bash
/api resource: users
```
```bash
/api endpoint: POST /users/{id}/reset-password
```
```bash
/api design: E-commerce API with products, orders, and payments
```

---

### `/data`

Designs data models, database schemas, and data structures. Uses controlled rupture operators to ensure data models are normalized, efficient, and handle relationships correctly.

**Usage:**
```bash
/data <entity or model>
```
```bash
/data model: <model name>
```
```bash
/data schema: <schema description>
```
```bash
/data design: <database design>
```
```bash
/data validate: <existing schema>
```

**Parameters:**
- `model: <name>`: Design data model for entity
- `schema: <description>`: Design database schema
- `design: <description>`: Design complete data architecture
- `validate: <description>`: Validate existing data model

**Examples:**
```bash
/data model: User with authentication and profile
```
```bash
/data schema: E-commerce database with products, orders, and customers
```
```bash
/data design: Multi-tenant SaaS application with user isolation
```

---

## Implementation

### `/scaffold`

Scaffolds project structure, boilerplate code, and initial setup files. Uses controlled rupture operators to create well-structured foundations that enable further development.

**Usage:**
```bash
/scaffold <project type>
```
```bash
/scaffold project: <type>
```
```bash
/scaffold component: <name>
```
```bash
/scaffold feature: <name>
```

**Parameters:**
- `project: <type>`: Scaffold project (e.g., react-app, api-server, library)
- `component: <name>`: Scaffold component structure
- `feature: <name>`: Scaffold feature module

**Examples:**
```bash
/scaffold project: react-app
```
```bash
/scaffold component: UserProfile
```
```bash
/scaffold feature: Authentication
```

---

### `/implement`

Generates implementation code from specifications, following best practices and patterns. Uses controlled rupture operators to ensure implementations are correct, efficient, and maintainable.

**Usage:**
```bash
/implement <specification>
```
```bash
/implement spec: <spec-path>
```
```bash
/implement feature: <description>
```

**Parameters:**
- `spec: <path>`: Implement from specification file
- `feature: <description>`: Implement feature from description

**Examples:**
```bash
/implement spec: api-spec.md
```
```bash
/implement feature: User authentication with JWT
```

---

### `/refactor`

Assists with code refactoring, identifying improvement opportunities and applying transformations safely. Uses controlled rupture operators to ensure refactoring maintains functionality while improving structure.

**Usage:**
```bash
/refactor <code-path>
```
```bash
/refactor file: <path>
```
```bash
/refactor pattern: <pattern-name>
```

**Parameters:**
- `file: <path>`: Refactor specific file
- `pattern: <name>`: Apply refactoring pattern

**Examples:**
```bash
/refactor file: src/utils/validation.ts
```
```bash
/refactor pattern: Extract method
```

---

### `/debt`

Identifies and analyzes technical debt, prioritizing improvements and creating remediation plans. Uses controlled rupture operators to understand debt patterns and plan effective resolution.

**Usage:**
```bash
/debt <scope>
```
```bash
/debt analyze: <path>
```
```bash
/debt prioritize: <scope>
```

**Parameters:**
- `analyze: <path>`: Analyze technical debt in path
- `prioritize: <scope>`: Prioritize debt remediation

**Examples:**
```bash
/debt analyze: src/
```
```bash
/debt prioritize: critical
```

---

## Debug / QA

### `/repro`

Helps reproduce bugs and issues by analyzing symptoms and creating reproduction steps. Uses controlled rupture operators to systematically identify root causes.

**Usage:**
```bash
/repro <issue>
```
```bash
/repro bug: <description>
```
```bash
/repro error: <error-message>
```

**Parameters:**
- `bug: <description>`: Reproduce bug from description
- `error: <message>`: Reproduce error from message

**Examples:**
```bash
/repro bug: User login fails with 500 error
```
```bash
/repro error: TypeError: Cannot read property 'id'
```

---

### `/debug`

Assists with debugging by analyzing code, identifying issues, and suggesting fixes. Uses controlled rupture operators to systematically debug problems.

**Usage:**
```bash
/debug <code or issue>
```
```bash
/debug code: <file-path>
```
```bash
/debug issue: <description>
```

**Parameters:**
- `code: <path>`: Debug code in file
- `issue: <description>`: Debug issue from description

**Examples:**
```bash
/debug code: src/api/auth.ts
```
```bash
/debug issue: Memory leak in data processing
```

---

### `/tests`

Generates comprehensive test suites including unit, integration, and e2e tests. Uses controlled rupture operators to ensure tests are thorough and maintainable.

**Usage:**
```bash
/tests <target>
```
```bash
/tests file: <file-path>
```
```bash
/tests feature: <feature-name>
```

**Parameters:**
- `file: <path>`: Generate tests for file
- `feature: <name>`: Generate tests for feature

**Examples:**
```bash
/tests file: src/utils/validation.ts
```
```bash
/tests feature: User authentication
```

---

### `/regression`

Analyzes regressions, identifies breaking changes, and creates regression test suites. Uses controlled rupture operators to systematically identify and prevent regressions.

**Usage:**
```bash
/regression <scope>
```
```bash
/regression analyze: <changes>
```
```bash
/regression test: <feature>
```

**Parameters:**
- `analyze: <changes>`: Analyze changes for regressions
- `test: <feature>`: Create regression tests for feature

**Examples:**
```bash
/regression analyze: Recent API changes
```
```bash
/regression test: Authentication flow
```

---

### `/review`

Assists with code reviews by analyzing changes, identifying issues, and providing feedback. Uses controlled rupture operators to ensure thorough and constructive reviews.

**Usage:**
```bash
/review <changes>
```
```bash
/review diff: <diff-path>
```
```bash
/review pr: <pr-number>
```

**Parameters:**
- `diff: <path>`: Review diff file
- `pr: <number>`: Review pull request

**Examples:**
```bash
/review diff: changes.diff
```
```bash
/review pr: 123
```

---

## Release / Ops

### `/changelog`

Generates changelogs from git history, commit messages, and changes. Uses controlled rupture operators to create comprehensive and well-organized changelogs.

**Usage:**
```bash
/changelog <scope>
```
```bash
/changelog version: <version>
```
```bash
/changelog since: <tag>
```

**Parameters:**
- `version: <version>`: Generate changelog for version
- `since: <tag>`: Generate changelog since tag

**Examples:**
```bash
/changelog version: 1.2.0
```
```bash
/changelog since: v1.1.0
```

---

### `/release`

Plans and coordinates releases, managing versions, dependencies, and deployment. Uses controlled rupture operators to ensure smooth and reliable releases.

**Usage:**
```bash
/release <version>
```
```bash
/release plan: <version>
```
```bash
/release execute: <version>
```

**Parameters:**
- `plan: <version>`: Plan release for version
- `execute: <version>`: Execute release for version

**Examples:**
```bash
/release plan: 1.2.0
```
```bash
/release execute: 1.2.0
```

---

### `/observability`

Designs observability systems including logging, metrics, tracing, and monitoring. Uses controlled rupture operators to ensure comprehensive observability.

**Usage:**
```bash
/observability <system>
```
```bash
/observability design: <system>
```
```bash
/observability metrics: <feature>
```

**Parameters:**
- `design: <system>`: Design observability for system
- `metrics: <feature>`: Design metrics for feature

**Examples:**
```bash
/observability design: Microservices API
```
```bash
/observability metrics: User authentication
```

---

### `/incident`

Assists with incident response, providing runbooks, analysis tools, and recovery procedures. Uses controlled rupture operators to systematically handle incidents.

**Usage:**
```bash
/incident <type>
```
```bash
/incident analyze: <description>
```
```bash
/incident runbook: <scenario>
```

**Parameters:**
- `analyze: <description>`: Analyze incident from description
- `runbook: <scenario>`: Generate runbook for scenario

**Examples:**
```bash
/incident analyze: API downtime
```
```bash
/incident runbook: Database connection failure
```

---

## Security / Privacy

### `/threat`

Creates threat models, identifies security risks, and designs mitigation strategies. Uses controlled rupture operators to ensure comprehensive security analysis.

**Usage:**
```bash
/threat <system>
```
```bash
/threat model: <system>
```
```bash
/threat analyze: <component>
```

**Parameters:**
- `model: <system>`: Create threat model for system
- `analyze: <component>`: Analyze threats for component

**Examples:**
```bash
/threat model: Authentication system
```
```bash
/threat analyze: API endpoints
```

---

### `/secrets`

Manages secrets, API keys, and sensitive data securely. Uses controlled rupture operators to ensure proper secrets handling and prevent exposure.

**Usage:**
```bash
/secrets <action>
```
```bash
/secrets audit: <path>
```
```bash
/secrets rotate: <key-name>
```

**Parameters:**
- `audit: <path>`: Audit secrets in path
- `rotate: <name>`: Rotate secret

**Examples:**
```bash
/secrets audit: src/
```
```bash
/secrets rotate: API_KEY
```

---

### `/privacy`

Analyzes privacy implications, data handling, and compliance with privacy regulations. Uses controlled rupture operators to ensure privacy-by-design.

**Usage:**
```bash
/privacy <scope>
```
```bash
/privacy analyze: <feature>
```
```bash
/privacy compliance: <regulation>
```

**Parameters:**
- `analyze: <feature>`: Analyze privacy for feature
- `compliance: <regulation>`: Check compliance (GDPR, CCPA, etc.)

**Examples:**
```bash
/privacy analyze: User data collection
```
```bash
/privacy compliance: GDPR
```

---

## Higher-order

### `/compose`

Composes operator sequences for complex tasks, optimizing for low dissipation and desired attractors. Uses controlled rupture operators to create effective operator chains.

**Usage:**
```bash
/compose <goal>
```
```bash
/compose goal: <description>
```
```bash
/compose sequence: <operators>
```

**Parameters:**
- `goal: <description>`: Compose sequence for goal
- `sequence: <operators>`: Validate operator sequence

**Examples:**
```bash
/compose goal: Break out of reasoning loop
```
```bash
/compose sequence: Para Ana Pro
```

---

### `/dissipate`

Analyzes dissipation rates, operator sequences, and attractor trajectories. Uses controlled rupture operators to understand and optimize reasoning stability.

**Usage:**
```bash
/dissipate <sequence>
```
```bash
/dissipate sequence: <operators>
```
```bash
/dissipate analyze: <path>
```

**Parameters:**
- `sequence: <operators>`: Analyze operator sequence
- `analyze: <path>`: Analyze code for dissipation patterns

**Examples:**
```bash
/dissipate sequence: Para Ana Pro
```
```bash
/dissipate analyze: reasoning_chain.py
```

---

### `/reverse-engineer`

Reverse engineers systems, code, and architectures to understand structure and behavior. Uses controlled rupture operators to systematically deconstruct and understand.

**Usage:**
```bash
/reverse-engineer <target>
```
```bash
/reverse-engineer code: <file-path>
```
```bash
/reverse-engineer system: <description>
```

**Parameters:**
- `code: <path>`: Reverse engineer code
- `system: <description>`: Reverse engineer system

**Examples:**
```bash
/reverse-engineer code: legacy_api.py
```
```bash
/reverse-engineer system: Microservices architecture
```

---

### `/attack`

Applies anomaly detection (HALIRA Step 5) to attack your own design or solution. Critical step for finding irreducible flaws before proceeding.

**Usage:**
```bash
/attack <solution>
```
```bash
/attack design: <description>
```
```bash
/attack solution: <description>
```
```bash
/attack code: <file-path>
```

**Parameters:**
- `solution`: The solution, design, or code to attack

**Examples:**
```bash
/attack design: Event sourcing + CQRS architecture
```
```bash
/attack solution: Use Redis for caching
```
```bash
/attack code: src/api/auth.ts
```

---

## Domain Packs

### `/seo`

Optimizes content for search engines, analyzing SEO factors and providing recommendations. Uses controlled rupture operators to ensure comprehensive SEO strategy.

**Usage:**
```bash
/seo <content>
```
```bash
/seo analyze: <url>
```
```bash
/seo optimize: <content-path>
```

**Parameters:**
- `analyze: <url>`: Analyze SEO for URL
- `optimize: <path>`: Optimize content for SEO

**Examples:**
```bash
/seo analyze: https://example.com
```
```bash
/seo optimize: content/blog-post.md
```

---

### `/perf-web`

Optimizes web performance including load times, rendering, and resource usage. Uses controlled rupture operators to ensure comprehensive performance improvements.

**Usage:**
```bash
/perf-web <target>
```
```bash
/perf-web analyze: <url>
```
```bash
/perf-web optimize: <code-path>
```

**Parameters:**
- `analyze: <url>`: Analyze performance for URL
- `optimize: <path>`: Optimize code for performance

**Examples:**
```bash
/perf-web analyze: https://example.com
```
```bash
/perf-web optimize: src/components/
```

---

### `/a11y`

Analyzes and improves accessibility, ensuring WCAG compliance and inclusive design. Uses controlled rupture operators to ensure comprehensive accessibility.

**Usage:**
```bash
/a11y <target>
```
```bash
/a11y analyze: <component>
```
```bash
/a11y fix: <issue>
```

**Parameters:**
- `analyze: <component>`: Analyze accessibility
- `fix: <issue>`: Fix accessibility issue

**Examples:**
```bash
/a11y analyze: NavigationMenu
```
```bash
/a11y fix: Missing alt text
```

---

### `/eval`

Evaluates AI models, prompts, systems, designs, and requests using evaluation frameworks and adversarial analysis. Uses controlled rupture operators to ensure comprehensive evaluation, stress-testing, and assumption challenging.

**Usage:**
```bash
/eval <target>
```
```bash
/eval model: <model-name>
```
```bash
/eval prompt: <prompt-text>
```
```bash
/eval system: <system-description>
```
```bash
/eval design: <description>
```
```bash
/eval request: <description>
```
```bash
/eval architecture: <description>
```

**Parameters:**
- `model: <name>`: Evaluate AI model performance
- `prompt: <text>`: Evaluate prompt effectiveness
- `system: <description>`: Evaluate AI system
- `design: <description>`: Adversarially evaluate and stress-test design
- `request: <description>`: Evaluate request as formal operator, challenge assumptions

**Examples:**
```bash
/eval model: gpt-4
```
```bash
/eval prompt: User authentication system
```
```bash
/eval system: RAG-based Q&A system
```

---

### `/prompt`

Engineers and optimizes prompts for AI systems, improving effectiveness and reliability. Uses controlled rupture operators to ensure optimal prompt design.

**Usage:**
```bash
/prompt <task>
```
```bash
/prompt engineer: <description>
```
```bash
/prompt optimize: <prompt-text>
```

**Parameters:**
- `engineer: <description>`: Engineer prompt for task
- `optimize: <text>`: Optimize existing prompt

**Examples:**
```bash
/prompt engineer: Code review assistant
```
```bash
/prompt optimize: Current prompt text
```

---

### `/rag`

Designs and optimizes Retrieval-Augmented Generation systems, improving retrieval and generation quality. Uses controlled rupture operators to ensure effective RAG architecture.

**Usage:**
```bash
/rag <system>
```
```bash
/rag design: <description>
```
```bash
/rag optimize: <system-path>
```

**Parameters:**
- `design: <description>`: Design RAG system
- `optimize: <path>`: Optimize existing RAG system

**Examples:**
```bash
/rag design: Document Q&A system
```
```bash
/rag optimize: src/rag/
```

---

### `/safety`

Analyzes AI safety concerns including alignment, robustness, and ethical considerations. Uses controlled rupture operators to ensure comprehensive safety analysis.

**Usage:**
```bash
/safety <system>
```
```bash
/safety analyze: <model>
```
```bash
/safety alignment: <system>
```

**Parameters:**
- `analyze: <model>`: Analyze safety for model
- `alignment: <system>`: Check alignment

**Examples:**
```bash
/safety analyze: LLM system
```
```bash
/safety alignment: Autonomous agent
```

---

### `/perf-mobile`

Optimizes mobile app performance including battery usage, memory, and network efficiency. Uses controlled rupture operators to ensure comprehensive mobile optimization.

**Usage:**
```bash
/perf-mobile <app>
```
```bash
/perf-mobile analyze: <app-path>
```
```bash
/perf-mobile optimize: <component>
```

**Parameters:**
- `analyze: <path>`: Analyze mobile app performance
- `optimize: <component>`: Optimize component

**Examples:**
```bash
/perf-mobile analyze: mobile-app/
```
```bash
/perf-mobile optimize: ImageLoader
```

---

### `/offline`

Designs offline-first systems with sync, caching, and conflict resolution. Uses controlled rupture operators to ensure robust offline functionality.

**Usage:**
```bash
/offline <system>
```
```bash
/offline design: <description>
```
```bash
/offline sync: <feature>
```

**Parameters:**
- `design: <description>`: Design offline-first system
- `sync: <feature>`: Design sync for feature

**Examples:**
```bash
/offline design: Note-taking app
```
```bash
/offline sync: Data synchronization
```

---

### `/store-release`

Assists with app store releases including metadata, screenshots, and compliance. Uses controlled rupture operators to ensure successful store releases.

**Usage:**
```bash
/store-release <platform>
```
```bash
/store-release prepare: <platform>
```
```bash
/store-release metadata: <app>
```

**Parameters:**
- `prepare: <platform>`: Prepare release for platform (iOS/Android)
- `metadata: <app>`: Generate store metadata

**Examples:**
```bash
/store-release prepare: iOS
```
```bash
/store-release metadata: MyApp
```

---

### `/threat-chain`

Creates threat models for blockchain systems including smart contracts, DeFi, and Web3 applications. Uses controlled rupture operators to ensure comprehensive blockchain security.

**Usage:**
```bash
/threat-chain <system>
```
```bash
/threat-chain model: <description>
```
```bash
/threat-chain audit: <contract>
```

**Parameters:**
- `model: <description>`: Create threat model
- `audit: <contract>`: Audit smart contract

**Examples:**
```bash
/threat-chain model: DeFi protocol
```
```bash
/threat-chain audit: TokenContract.sol
```

---

### `/gas`

Optimizes gas usage in smart contracts and blockchain transactions. Uses controlled rupture operators to ensure efficient gas consumption.

**Usage:**
```bash
/gas <contract>
```
```bash
/gas optimize: <contract-path>
```
```bash
/gas analyze: <transaction>
```

**Parameters:**
- `optimize: <path>`: Optimize contract gas usage
- `analyze: <tx>`: Analyze transaction gas

**Examples:**
```bash
/gas optimize: contracts/Token.sol
```
```bash
/gas analyze: 0x123...
```

---

### `/audit-prep`

Prepares codebases for security audits, compliance reviews, and certifications. Uses controlled rupture operators to ensure comprehensive audit readiness.

**Usage:**
```bash
/audit-prep <scope>
```
```bash
/audit-prep security: <codebase>
```
```bash
/audit-prep compliance: <standard>
```

**Parameters:**
- `security: <codebase>`: Prepare for security audit
- `compliance: <standard>`: Prepare for compliance (SOC2, ISO27001, etc.)

**Examples:**
```bash
/audit-prep security: src/
```
```bash
/audit-prep compliance: SOC2
```

---

## Operators

### `/ana`

Applies Ana- (upward/throughout) operator to elevate systems through structure. Enables self-improvement where each improvement enables further improvement.

**Usage:**
```bash
/ana <target>
```
```bash
/ana elevate: <system>
```
```bash
/ana improve: <code-path>
```
```bash
/ana² <target>
```

**Parameters:**
- `target`: The system, code, or structure to elevate

**Examples:**
```bash
/ana elevate: Authentication system
```
```bash
/ana improve: src/utils/validation.ts
```
```bash
/ana² Code quality system
```

---

### `/telo`

Applies Telo- (purpose-driven) operator to accelerate work toward completion. Structures tasks to pull toward goals, creating compound acceleration where completion accelerates completion.

**Usage:**
```bash
/telo <goal>
```
```bash
/telo goal: <description>
```
```bash
/telo accelerate: <task>
```

**Parameters:**
- `goal`: The purpose or completion state you're accelerating toward

**Examples:**
```bash
/telo goal: Working authentication system
```
```bash
/telo accelerate: Feature development
```
```bash
/telo² Complete the completion system
```

---

### `/retro`

Applies retro-operators to analyze past decisions, work backward from problems, or learn from history. Useful for understanding legacy code, debugging, and learning from past patterns.

**Usage:**
```bash
/retro <operation> <target>
```
```bash
/retro active <code-path>
```
```bash
/retro deductive <problem>
```
```bash
/retro ject <pattern>
```
```bash
/retro agnostic <decision>
```

**Examples:**
```bash
/retro active src/legacy/auth.ts
```
```bash
/retro deductive Users can't log in
```
```bash
/retro ject Missing null checks
```

---

## Protocols

### `/halira`

Activates the HALIRA Protocol for handling foundational contradictions and paradigm shifts. Use when encountering irreducible paradoxes or contradictions that cannot be solved within the current paradigm.

**Usage:**
```bash
/halira <problem-description>
```
```bash
/halira contradiction: <description>
```
```bash
/halira paradox: <description>
```

**Parameters:**
- `problem-description`: Description of the contradiction or paradox you're facing

**Examples:**
```bash
/halira contradiction: Need both consistency and scalability but they conflict
```
```bash
/halira paradox: Code must be simple but also handle all edge cases
```
```bash
/halira I need to scale this system but maintain strong consistency guarantees
```

---

### `/rupture`

Applies Rupture Navigation (HALIRA Step 6) to construct paradigm shifts when anomalies are found. First tries duality, then constructs paradigm shift operator if needed.

**Usage:**
```bash
/rupture <anomaly>
```
```bash
/rupture anomaly: <description>
```
```bash
/rupture shift: <contradiction>
```

**Parameters:**
- `anomaly`: The Jacobi Anomaly or contradiction that requires paradigm shift

**Examples:**
```bash
/rupture anomaly: Event log is single point of failure
```
```bash
/rupture shift: Need consistency and scalability but they conflict
```
```bash
/rupture Single database can't scale
```

---

### `/mode`

Detects and reports the operational mode (Duality Navigation vs HALIRA Protocol) for a given problem or task.

**Usage:**
```bash
/mode <problem>
```
```bash
/mode detect: <description>
```
```bash
/mode analyze: <task>
```

**Parameters:**
- `problem`: The problem or task to analyze for mode detection

**Examples:**
```bash
/mode detect: Fix login bug
```
```bash
/mode analyze: Scale database system
```
```bash
/mode Need both X and Y but they conflict
```

---

## Utilities

### `/learn`

A unified technical research tool that synthesizes knowledge from multiple sources (web, codebase, existing knowledge base) and creates comprehensive learning documents. Builds knowledge graphs through cross-referencing, enables iterative refinement, and provides context-aware integration recommendations. Each research action improves the knowledge base, which in turn improves future research capabilities (Ana- operator: self-improving improvement).

**Usage:**
```bash
/learn <input> [options]
```
```bash
/learn topic: <topic> [options]
```
```bash
/learn url: <url> [options]
```
```bash
/learn file: <file-path> [options]
```
```bash
/learn folder: <folder-path> [options]
```
```bash
/learn project: [project-path] [options]
```
```bash
/learn update: <existing-topic> [options]
```
```bash
/learn relate: <topic1> <topic2> [options]
```
```bash
/learn graph: [topic]
```

**Parameters:**
- `input`: Any of the above (auto-detected) or explicitly specified with prefix
- `update: <existing-topic>`: Update/refine an existing knowledge document
- `relate: <topic1> <topic2>`: Build relationship between two topics
- `graph: [topic]`: Show knowledge graph for topic (or entire knowledge base)
- `relate`: Include project integration recommendations (analyzes codebase structure)

---

### `/commit`

A sophisticated code historian that understands the deeper context of changes: developer motives, file purposes, creation/deletion reasons, and project goals. Goes beyond analyzing diffs to understand WHY changes were made, WHAT purpose files serve, and HOW they fit into the project's evolution. Writes commit messages that reflect developer intent and project history. Each commit improves understanding of change patterns, which improves future commit analysis (Ana- operator: self-improving improvement).

**Usage:**
```bash
/commit
```
```bash
/commit motive: <goal or intent>
```
```bash
/commit goal: <developer goal>
```
```bash
/commit dry run
```
```bash
/commit preview
```
```bash
/commit interactive
```
```bash
/commit analyze
```
```bash
/commit scope: <scope>
```
```bash
/commit no verify
```
```bash
/commit push
```
```bash
/commit push branch: <branch-name>
```
```bash
/commit context: <number>
```
```bash
/commit learn from history
```

**Parameters:**
- `motive: <text>`: Explicitly state developer motive or goal for these changes
- `goal: <text>`: Specify the goal these changes are working toward
- `dry run` or `preview`: Show what commits would be created without executing them
- `interactive`: Prompt for confirmation before creating each commit
- `analyze`: Deep analysis mode - show motive understanding, file purposes, historical context

---

### `/self-improve`

Enables self-improving workflows where the system learns from its own operations and improves over time. Uses controlled rupture operators (especially Ana- for self-improving improvement) to create systems that elevate themselves through better structure.

**Usage:**
```bash
/self-improve <target>
```
```bash
/self-improve analyze: <system>
```
```bash
/self-improve optimize: <workflow>
```
```bash
/self-improve learn: <pattern>
```

**Parameters:**
- `analyze: <system>`: Analyze system for improvement opportunities
- `optimize: <workflow>`: Optimize workflow based on patterns
- `learn: <pattern>`: Learn from successful patterns

**Examples:**
```bash
/self-improve analyze: Code generation workflow
```
```bash
/self-improve optimize: Test generation process
```
```bash
/self-improve learn: Successful refactoring patterns
```

---


## Command Categories Summary

- **Foundation**: Core operator infrastructure (`operator-sequence`, `detect-state`, `dissipation`)
- **Core**: Project management (`goal`, `plan`, `scope`, `status`, `decide`)
- **Product / Eng**: Specifications and design (`spec`, `ux`, `api`, `data`)
- **Implementation**: Code development (`scaffold`, `implement`, `refactor`, `debt`)
- **Debug / QA**: Testing and quality (`repro`, `debug`, `tests`, `regression`, `review`)
- **Release / Ops**: Deployment and operations (`changelog`, `release`, `observability`, `incident`)
- **Security / Privacy**: Security analysis (`threat`, `secrets`, `privacy`)
- **Higher-order**: Meta-operations (`compose`, `dissipate`, `reverse-engineer`, `attack`)
- **Domain Packs**: Specialized domains (AI, web, mobile, blockchain, etc.)
- **Operators**: Direct operator application (`ana`, `telo`, `retro`)
- **Protocols**: Advanced protocols (`halira`, `rupture`, `mode`)
- **Utilities**: Helper commands (`learn`, `commit`, `self-improve`)

## Tips

- Commands can be chained: `/goal define: X` then `/plan create: Y`
- Use `/operator-sequence` to execute custom operator sequences
- Use `/detect-state` to check reasoning state (J=0, S*, ∅)
- Use `/dissipate` to analyze operator sequence effectiveness
- See individual command files in `.cursor/commands/` for detailed documentation

## Related Documentation

- `docs/plans/suggested-commands.md` - Command surface design
- `.cursor/rules/general/operators-reference.mdc` - Operator reference
- `.cursor/rules/general/dissipation-lookup.mdc` - Dissipation sequences
