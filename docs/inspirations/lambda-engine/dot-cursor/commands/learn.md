# /learn Command - Unified Technical Research Tool

## Description

A unified technical research tool that synthesizes knowledge from multiple sources (web, codebase, existing knowledge base) and creates comprehensive learning documents. Builds knowledge graphs through cross-referencing, enables iterative refinement, and provides context-aware integration recommendations. Each research action improves the knowledge base, which in turn improves future research capabilities (Ana- operator: self-improving improvement).

## Usage

```bash
# Universal input - automatically detects type (topic, URL, file, folder, project doc)
/learn <input> [options]

# Explicit input types
/learn topic: <topic> [options]
/learn url: <url> [options]
/learn file: <file-path> [options]
/learn folder: <folder-path> [options]
/learn project: [project-path] [options]

# Knowledge management
/learn update: <existing-topic> [options]
/learn relate: <topic1> <topic2> [options]
/learn graph: [topic]
```

**Input Types (Auto-Detected):**

- `topic`: Text topic name → Web research + knowledge base synthesis
- `url`: HTTP/HTTPS URL → Fetch and analyze content
- `file`: File path (`.md`, `.py`, `.ts`, `.js`, etc.) → Analyze file content
- `folder`: Directory path → Analyze all files in folder recursively
- `project`: Project root or `docs/` → Analyze project documentation structure

**Parameters:**

- `input`: Any of the above (auto-detected) or explicitly specified with prefix
- `update: <existing-topic>`: Update/refine an existing knowledge document
- `relate: <topic1> <topic2>`: Build relationship between two topics
- `graph: [topic]`: Show knowledge graph for topic (or entire knowledge base)

**Options:**

- `relate`: Include project integration recommendations (analyzes codebase structure)
- `deep`: Perform deep research (multiple sources, extended analysis)
- `codebase`: Include codebase analysis in research (searches for related patterns)
- `cross-ref`: Automatically cross-reference with existing knowledge base
- `graph`: Generate knowledge graph visualization for the topic
- `update-index`: Update knowledge base index with new relationships
- `recursive`: For folders, recursively analyze subdirectories (default: true)
- `filter: <pattern>`: File pattern filter for folder analysis (e.g., `filter: *.md,*.py`)
- `extract`: Extract key concepts from files/folders into structured knowledge
- `synthesize`: Synthesize multiple inputs into unified knowledge document

## Output

### Primary Output

Saves a comprehensive markdown document to: `docs/knowledge-base/{sanitized-topic}.md`

**File Naming Convention:**
- Topic names: Lowercase, spaces → hyphens, special chars removed
- Examples: `react-hooks.md`, `graphql-api.md`, `event-sourcing.md`
- File paths preserved for folder/project inputs: `src-auth-module.md`

### Secondary Outputs (Self-Improving Structure)

**Knowledge Base Infrastructure:**
- Updates `docs/knowledge-base/00-index.md` with:
  - New topic entry with metadata
  - Cross-reference links to related topics
  - Category/tag classification
  - Last updated timestamp
  - Research quality score (based on source diversity and depth)

- Creates/updates relationship mappings in document metadata:
  - Bidirectional links between related topics
  - Concept dependency graph
  - Integration point mappings
  - Knowledge gap identification

- Generates knowledge graph visualizations (if `graph` option used):
  - Mermaid diagram or Graphviz representation
  - Interactive relationship map
  - Concept hierarchy visualization
  - Integration pathway diagrams

**Quality Metrics Tracking:**
- Records research depth (shallow/deep/comprehensive)
- Tracks source diversity (web/codebase/docs count)
- Measures cross-reference density
- Calculates integration completeness score
- Enables future research improvements through pattern recognition

## Document Structure (Elevated Through Ana-)

The generated document follows a progressive enhancement structure where each section builds upon previous sections, enabling deeper understanding and future improvements. Each document improves the knowledge base structure, which improves future research capabilities.

### Required Core Structure

#### 1. **Metadata Section** (YAML Frontmatter)

**Required Fields:**
```yaml
---
title: "Topic Name"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
version: 1.0
quality_score: 0.85
research_depth: "shallow" | "deep" | "comprehensive"
source_count: 5
categories: ["category1", "category2"]
tags: ["tag1", "tag2"]
related_topics:
  - topic-name-1
  - topic-name-2
knowledge_graph:
  prerequisites: []
  builds_on: []
  enables: []
integration_status: "analyzed" | "integrated" | "pending"
codebase_references:
  - path: "src/module/file.ts"
    relevance: "high"
sources:
  web:
    - url: "https://example.com"
      title: "Source Title"
  codebase:
    - path: "src/patterns/"
      pattern_type: "implementation"
  knowledge_base:
    - document: "related-topic.md"
---
```

**Quality Criteria:**
- Complete metadata enables better cross-referencing
- Quality scores improve future research prioritization
- Integration status tracks project adoption
- Source tracking enables verification and updates

**Self-Improving Pattern:**
- Metadata completeness improves knowledge graph quality
- Better graphs → better recommendations → better research

#### 2. **Knowledge Graph Visualization** (if `graph` option used)

**Format Options:**
- Mermaid diagram for GitHub/Cursor rendering
- Graphviz DOT format for external tools
- Interactive HTML visualization (if supported)

**Content Requirements:**
- Shows relationships to other topics in knowledge base
- Visual representation of concept connections
- Enables discovery of related knowledge
- Highlights knowledge gaps and opportunities
- Displays integration pathways

**Self-Improving Pattern:**
- Each graph addition strengthens the knowledge network
- Better graphs → better recommendations → better research
- Visual patterns reveal knowledge structure improvements

#### 3. **Technical Terms Translation Section**

**Structure:**
```markdown
## Technical Terms Translation

| Technical Term | Simple English | Context |
|----------------|----------------|---------|
| API | Application Programming Interface | A way for programs to communicate |
| JWT | JSON Web Token | A secure way to verify identity |
| GraphQL | Graph Query Language | A flexible way to request data |
```

**Quality Standards:**
- Every technical term used in document must be translated
- Cross-reference terms used in related documents
- Provide context for ambiguous terms
- Link to related concepts in knowledge base
- Enable non-technical readers to understand

**Progressive Enhancement:**
- Basic: Simple term = definition
- Enhanced: Term = definition + context + examples
- Advanced: Term = definition + context + examples + related concepts + usage patterns

#### 4. **Concise Explanation**

**Structure Requirements:**
- **Opening Hook:** One sentence that captures essence
- **Core Concept:** 2-3 paragraphs explaining the topic
- **Key Characteristics:** Bulleted list of essential features
- **Use Cases:** When and why to use this concept
- **Related Concepts:** Links to related knowledge base topics

**Quality Criteria:**
- Uses translated terms consistently
- References related concepts from knowledge base (if `cross-ref` option used)
- Balances brevity with completeness
- Provides actionable insights
- Enables further learning through references

**Self-Improving Pattern:**
- Each explanation improves through cross-referencing
- Better explanations → better understanding → better future research
- Pattern recognition identifies explanation improvements

#### 5. **Explain to a Non-Developer Section**

**Structure:**
```markdown
## Explain to a Non-Developer

### The Core Idea
[One-paragraph plain language summary]

### Real-World Analogy
[Relatable analogy that makes the concept tangible]

### Why It Matters
[Practical implications and benefits]

### Common Misconceptions
[What people often get wrong]

### When You'd Encounter This
[Real-world scenarios where this appears]
```

**Quality Standards:**
- Zero technical jargon (or immediately explained)
- Uses analogies and real-world examples
- Makes concept accessible to someone without programming knowledge
- Addresses common questions and misconceptions
- Connects to familiar experiences

**Progressive Enhancement:**
- Basic: Simple explanation
- Enhanced: Explanation + analogy + examples
- Advanced: Explanation + analogy + examples + misconceptions + real-world scenarios

#### 6. **Related Topics** (if `cross-ref` option used)

**Structure:**
```markdown
## Related Topics

### Prerequisites (Read First)
- [Topic Name](./topic-name.md) - Required foundation
- [Another Topic](./another-topic.md) - Core concept

### Builds On (Related Concepts)
- [Related Topic](./related-topic.md) - Extends this concept
- [Another Related](./another-related.md) - Complementary approach

### Enables (What This Unlocks)
- [Advanced Topic](./advanced-topic.md) - Built on this foundation
- [Application](./application.md) - Practical use case

### Suggested Reading Order
1. [Foundation Topic](./foundation.md)
2. [This Topic](./current-topic.md)
3. [Advanced Application](./advanced.md)
```

**Quality Criteria:**
- Explains how topics connect (not just lists)
- Provides reading order for comprehensive understanding
- Identifies knowledge gaps
- Suggests learning pathways
- Enables discovery of related knowledge

**Self-Improving Pattern:**
- Each cross-reference strengthens document relationships
- Better relationships → better context → better research
- Creates self-reinforcing knowledge network

#### 7. **Project Integration Recommendations** (if `relate` option is used)

**Structure:**
```markdown
## Project Integration Recommendations

### Current State Analysis
- **Existing Patterns:** [What patterns already exist in codebase]
- **Integration Points:** [Where this could fit]
- **Gaps:** [What's missing]

### Recommended Approach
1. **Phase 1:** [Initial integration steps]
   - Code example or architectural suggestion
   - References to existing patterns

2. **Phase 2:** [Progressive enhancement]
   - Integration with existing systems
   - Migration considerations

### Code Examples
\`\`\`typescript
// Example integration code
\`\`\`

### Considerations
- Performance implications
- Security considerations
- Testing requirements
- Migration path

### Integration Checklist
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3
```

**Quality Standards:**
- Specific recommendations based on codebase analysis
- References existing patterns in project
- Provides practical steps and considerations
- Includes code examples or architectural suggestions
- Maps integration points with existing systems
- Identifies risks and mitigation strategies

**Self-Improving Pattern:**
- Each integration improves codebase understanding
- Better understanding → better recommendations → better integrations
- Tracks integration success for future improvements

#### 8. **Research Sources**

**Structure:**
```markdown
## Research Sources

### Web Sources
- [Source Title](URL) - [Brief description of relevance]

### Codebase Analysis
- `src/path/to/file.ts` - [Pattern or concept found]
- `src/another/path/` - [Architecture pattern]

### Knowledge Base References
- [Related Document](./related-doc.md) - [How it relates]

### Additional Reading
- [External Resource](URL) - [Why it's valuable]
```

**Quality Criteria:**
- All URLs or sources consulted are listed
- Codebase locations analyzed (if `--codebase` used)
- Related documents referenced with context
- Enables verification and further research
- Provides credibility and traceability

**Self-Improving Pattern:**
- Source quality tracking improves future research
- Better sources → better documents → better knowledge base
- Pattern recognition identifies high-quality sources

### Optional Enhanced Sections (Progressive Enhancement)

#### 9. **Code Patterns** (if file/folder input)
- Extracted code patterns
- Architecture diagrams
- Dependency analysis
- Pattern variations

#### 10. **Architecture Overview** (if project input)
- Project structure analysis
- Technology stack identification
- Pattern catalog
- Integration points

#### 11. **Learning Path** (if multiple related topics)
- Structured learning sequence
- Prerequisite mapping
- Skill progression
- Practice exercises

#### 12. **Future Research Opportunities**
- Identified knowledge gaps
- Suggested follow-up research
- Open questions
- Areas for deeper exploration

### Document Quality Validation

**Before saving, validate:**
- ✅ All technical terms translated
- ✅ All sources cited
- ✅ Cross-references functional
- ✅ Metadata complete
- ✅ Code examples tested (if applicable)
- ✅ Integration recommendations actionable
- ✅ Non-developer section accessible
- ✅ Knowledge graph relationships accurate

**Quality Score Calculation:**
- Source diversity (0-0.3)
- Cross-reference density (0-0.2)
- Integration completeness (0-0.2)
- Explanation clarity (0-0.15)
- Code example quality (0-0.15)

**Self-Improving Mechanism:**
- Quality scores inform future research strategies
- Low scores trigger improvement suggestions
- High scores identify successful patterns
- Each document improves the knowledge base structure

## Implementation Steps

When `/learn <input>` is invoked:

### Phase 0: Input Detection & Parsing (Telo- Acceleration)

1. **Auto-Detect Input Type:**
   - If starts with `http://` or `https://` → Treat as URL
   - If matches file path pattern (contains `/` or `\`) → Check if file/folder exists
   - If folder path (directory exists) → Treat as folder analysis
   - If file path (file exists) → Treat as file analysis
   - If explicit prefix (`topic:`, `url:`, `file:`, `folder:`, `project:`) → Use specified type
   - Otherwise → Treat as topic name

2. **Parse Input for Multiple Sources:**
   - Support multiple inputs: `/learn topic1 topic2 folder:./docs`
   - If multiple inputs: Enable `--synthesize` mode automatically
   - Structure parallel analysis streams (Telo-: each stream pulls toward unified goal)

### Phase 1: Multi-Source Research

3. **Check Existing Knowledge:**
   - Search `docs/knowledge-base/` for existing documents on topic/input
   - If exists and `update:` not specified: Ask if user wants to update or create new
   - Extract relationships from existing knowledge base index

4. **Determine Input Sources (Parallel Streams - Telo- Acceleration):**

   **For Topics:**
   - Perform web search about the topic
   - If `--codebase` flag: Search codebase for related patterns
   - If `--cross-ref` flag: Analyze existing knowledge base

   **For URLs:**
   - Fetch and analyze content from URL
   - Extract key concepts and technical terms
   - Identify related topics for cross-referencing

   **For Files:**
   - Read and analyze file content
   - Extract code patterns, documentation, comments
   - Identify key concepts and technical terms
   - If code file: Analyze structure, patterns, dependencies
   - If markdown: Extract documentation structure and concepts

   **For Folders:**
   - List all files in folder (respect `--filter` if provided)
   - If `--recursive`: Process subdirectories
   - Analyze each file in parallel where possible
   - Synthesize folder-level patterns and architecture
   - Identify common themes, patterns, and relationships

   **For Project Documents:**
   - Analyze project structure (README, docs/, architecture files)
   - Extract project overview, architecture, patterns
   - Identify key technologies, frameworks, patterns
   - Map project knowledge structure

5. **Gather Comprehensive Information (Compound Acceleration):**
   - Research from multiple angles simultaneously
   - Identify key concepts, relationships, and processes
   - Extract technical terms that need translation
   - If `--codebase`: Identify how topic relates to current project structure
   - If `--cross-ref`: Map relationships to existing knowledge documents
   - If `--extract`: Extract structured knowledge from files/folders
   - If multiple inputs: Synthesize into unified understanding

### Phase 2: Knowledge Synthesis (Integration Points - Telo-)

6. **Build Knowledge Graph:**
   - Identify relationships to other topics
   - Map concept dependencies
   - Create cross-reference links
   - If `--graph` flag: Generate visual knowledge graph
   - For folders/files: Map file relationships and dependencies

7. **Synthesize Multiple Inputs** (if multiple inputs provided):
   - Integrate knowledge from all sources
   - Identify common themes and patterns
   - Create unified understanding
   - Map relationships between different input sources
   - Structure as coherent knowledge document

8. **Analyze Project Context** (if `relate` or `codebase` options):
   - Search codebase for related implementations
   - Identify existing patterns that relate to topic
   - Find integration points and architectural connections
   - Understand current project structure and conventions
   - For file/folder inputs: Map to existing project structure

### Phase 3: Document Generation (Completion Acceleration - Telo-)

9. **Generate Document Sections:**
    - Write metadata with relationships and sources
    - For files/folders: Include file structure, paths, and relationships
    - Write concise explanation using technical terms
    - Create technical terms translation section (cross-reference with existing terms)
    - Write non-developer explanation section
    - If `--cross-ref`: Add related topics section with explanations
    - If `--relate` or `--codebase`: Generate project integration recommendations with codebase references
    - If file/folder input: Add file structure section and code patterns
    - If project input: Add project overview and architecture section
    - Add research sources section (URLs, file paths, folders analyzed)

10. **Update Knowledge Base Index:**
    - If `--update-index` flag: Update `docs/knowledge-base/00-index.md`
    - Add new topic to index
    - Update relationship mappings
    - Maintain knowledge graph structure
    - For file/folder inputs: Map to project structure

11. **Save Document:**
    - Determine document name from input:
      - Topic: Use topic name
      - URL: Extract meaningful name from URL or content
      - File: Use filename (sanitized)
      - Folder: Use folder name or path (sanitized)
      - Project: Use project name
    - Sanitize name for filename (lowercase, replace spaces with hyphens, remove special chars)
    - Create directory if it doesn't exist: `docs/knowledge-base/`
    - Save as: `docs/knowledge-base/{sanitized-name}.md`
    - Ensure proper markdown formatting and frontmatter

### Phase 4: Self-Improvement (Ana- Operator)

12. **Learn from Research:**
    - Identify patterns in research process
    - Note which sources were most valuable
    - Record relationships discovered
    - Update research strategies for future use

13. **Improve Knowledge Base:**
    - Strengthen cross-references
    - Fill gaps in knowledge graph
    - Improve document structure based on new insights
    - Enable better future research through improved organization

## Examples

### Topic Research (Auto-Detected)
```bash
/learn react hooks
# Auto-detects as topic, creates new document with standard sections

/learn machine learning --relate
# Includes project integration recommendations
```

### URL Research (Auto-Detected)
```bash
/learn https://example.com/article
# Auto-detects as URL, fetches and analyzes content

/learn https://graphql.org/learn graphql --deep --graph
# Fetches from URL, performs deep analysis, generates knowledge graph
```

### File Analysis (Auto-Detected or Explicit)
```bash
/learn src/utils/validation.ts
# Auto-detects as file, analyzes code structure and patterns

/learn file: README.md --extract
# Explicitly specifies file, extracts key concepts

/learn file: besai/orchestrate.py --codebase --relate
# Analyzes Python file, includes codebase context and integration recommendations
```

### Folder Analysis (Auto-Detected or Explicit)
```bash
/learn src/components
# Auto-detects as folder, analyzes all files in folder

/learn folder: docs/ --recursive --filter "*.md"
# Explicitly specifies folder, recursively processes markdown files only

/learn folder: besai/ --extract --codebase
# Analyzes entire module folder, extracts patterns, includes codebase context
```

### Project Documentation Analysis
```bash
/learn project:
# Analyzes current project (README, docs/, architecture files)

/learn project: ./other-project
# Analyzes specified project's documentation structure

/learn project: --deep --graph
# Deep analysis with knowledge graph visualization
```

### Multi-Input Synthesis (Telo- Compound Acceleration)
```bash
/learn react hooks src/components/hooks/ https://react.dev/hooks
# Synthesizes: topic + folder + URL into unified knowledge document

/learn folder: src/utils/ topic: utility-patterns --synthesize
# Combines folder analysis with topic research

/learn file: README.md folder: docs/ --extract --relate
# Synthesizes project documentation from multiple sources
```

### Deep Research with Codebase Analysis
```bash
/learn graphql --codebase --relate --cross-ref
# Researches GraphQL, analyzes codebase for existing patterns,
# cross-references with knowledge base, and provides integration recommendations

/learn authentication --codebase --cross-ref --relate --graph
# Comprehensive research: web + codebase + knowledge base + integration + graph
```

### Updating Existing Knowledge
```bash
/learn update: react-hooks --codebase
# Updates existing document with new codebase analysis

/learn update: machine-learning --deep
# Refines existing document with deeper research

/learn update: project-architecture folder: src/ --extract
# Updates project architecture document with new folder analysis
```

### Building Relationships
```bash
/learn relate: react-hooks state-management
# Creates relationship between two topics, updates both documents

/learn graph: react-hooks
# Shows knowledge graph for react-hooks topic

/learn graph:
# Shows entire knowledge base graph
```

### Senior Developer Workflows (Telo- Goal: Unified Research)
```bash
# Understand new codebase module
/learn folder: src/auth/ --codebase --relate --graph

# Research technology + analyze project usage
/learn graphql folder: src/graphql/ --codebase --relate

# Document project architecture
/learn project: --deep --extract --graph

# Learn from external source + integrate
/learn https://example.com/pattern folder: src/patterns/ --synthesize --relate
```

## Self-Improving Features (Ana- Operator)

The tool elevates itself through structure:

1. **Knowledge Graph Building:**
   - Each research adds to knowledge graph
   - Better graph → better recommendations → better research
   - Enables discovery of knowledge gaps
   - File/folder analysis strengthens project knowledge graph

2. **Pattern Recognition:**
   - Learns from codebase analysis patterns
   - Identifies common integration points
   - Improves recommendations over time
   - Recognizes file/folder patterns across projects

3. **Cross-Reference Strengthening:**
   - Each cross-reference improves document relationships
   - Better relationships → better context → better research
   - Creates self-reinforcing knowledge network
   - File/folder inputs create stronger project connections

4. **Iterative Refinement:**
   - Update capability enables continuous improvement
   - Each update incorporates new insights
   - Documents improve through use
   - File/folder analysis can update existing project docs

5. **Research Strategy Evolution:**
   - Learns which sources are most valuable
   - Adapts research approach based on input type
   - Improves synthesis methods
   - Optimizes file/folder analysis strategies

## Purpose-Driven Acceleration (Telo- Operator)

The tool accelerates toward unified research completion:

1. **Unified Input Handling:**
   - Single command handles all input types
   - Auto-detection eliminates friction
   - Parallel processing accelerates completion
   - Each input type pulls toward unified knowledge document

2. **Compound Acceleration:**
   - Multiple inputs processed in parallel
   - Synthesis creates unified understanding faster
   - Each source accelerates others (web + codebase + files = faster completion)
   - Integration points defined upfront for seamless synthesis

3. **Goal-Oriented Structure:**
   - Every feature pulls toward "complete research document"
   - File/folder analysis accelerates project understanding
   - Multi-source synthesis accelerates comprehensive knowledge
   - Each capability completes the unified research goal

4. **Completion Acceleration:**
   - Structured workflow pulls toward document completion
   - Parallel streams integrate at defined points
   - Each phase accelerates the next
   - Final document represents complete research in one place

## Error Handling

- If input is missing: Show usage message with examples of all input types
- If web search fails: Inform user and suggest manual URL, file, or `--codebase` flag
- If file/folder doesn't exist: Show clear error with path, suggest checking path
- If file/folder is inaccessible: Show permission error, suggest alternatives
- If directory creation fails: Show error and suggest manual creation
- If file already exists: Ask user if they want to update, overwrite, or create new
- If codebase search fails: Continue with available sources, inform user
- If knowledge base index missing: Create it, inform user
- If cross-reference fails: Continue without cross-references, inform user
- If folder is too large: Warn user, suggest `--filter` or specific subfolder
- If file type unsupported: Inform user, suggest conversion or manual extraction

## Integration with Other Tools

- **Research Protocol**: Follows 8-step research protocol when analyzing codebase, files, folders
- **Knowledge Base**: Integrates with existing `docs/knowledge-base/` structure
- **Codebase Analysis**: Uses semantic search and grep for pattern discovery
- **File System**: Reads and analyzes files/folders from any accessible location
- **Documentation**: Updates index and maintains knowledge graph relationships
- **Project Analysis**: Understands project structure, conventions, and patterns

## Senior Developer Use Cases

### Understanding New Codebase
```bash
/learn folder: src/ --codebase --relate --graph
# Complete understanding of source code structure
```

### Researching Technology + Project Integration
```bash
/learn graphql folder: src/graphql/ --codebase --relate
# Research technology and analyze project usage simultaneously
```

### Documenting Project Architecture
```bash
/learn project: --deep --extract --graph
# Comprehensive project documentation from existing files
```

### Learning from External Source + Codebase
```bash
/learn https://example.com/pattern folder: src/patterns/ --synthesize --relate
# Combine external knowledge with internal implementation
```

### Quick File/Folder Understanding
```bash
/learn src/utils/validation.ts
# Instant understanding of specific file
```

## Related Commands

- `/ana`: Apply Ana- operator to elevate research capabilities
- `/retro`: Analyze past research to improve future research
- `/telo`: Accelerate research toward specific goals (this command embodies Telo-)
