# /eval Command - Evaluation Framework

## Description

Evaluates AI models, prompts, systems, designs, and requests using evaluation frameworks and adversarial analysis. Uses controlled rupture operators to ensure comprehensive evaluation, stress-testing, and assumption challenging.

## Usage

```bash
# AI Model & System Evaluation
/eval <target>
/eval model: <model-name>
/eval prompt: <prompt-text>
/eval system: <system-description>

# Adversarial Evaluation (Designs & Requests)
/eval design: <description>
/eval request: <description>
/eval architecture: <description>
```

**Parameters:**

- `model: <name>`: Evaluate AI model performance
- `prompt: <text>`: Evaluate prompt effectiveness
- `system: <description>`: Evaluate AI system
- `design: <description>`: Adversarially evaluate and stress-test design
- `request: <description>`: Evaluate request as formal operator, challenge assumptions
- `architecture: <description>`: Stress-test architecture design

## What It Does

**AI Evaluation Mode:**
- **Meta** (⟲): Reflect on evaluation approach
- **Ortho** (⊥): Validate metrics and correctness
- **Weave** (🕸️): Integrate evaluation components
- **Echo** (🔊): Replicate evaluation patterns

**Adversarial Evaluation Mode:**
- Parses prompt/design as formal operator
- Evaluates effectiveness and assumptions
- Challenges assumptions and finds contradictions
- Identifies edge cases and failure modes
- Stress-tests the design
- Suggests improvements and alternatives

## Examples

```bash
# AI Model Evaluation
/eval model: gpt-4
/eval prompt: User authentication system
/eval system: RAG-based Q&A system

# Adversarial Evaluation
/eval design: Microservices architecture
# Evaluates and stress-tests the microservices design

/eval request: Add caching to all endpoints
# Challenges the request, finds edge cases, suggests improvements

/eval architecture: Event sourcing + CQRS
# Stress-tests architecture, finds contradictions
```

## Output

**AI Evaluation Mode:**
- Evaluation metrics
- Performance analysis
- Benchmark comparisons
- Improvement recommendations
- Evaluation reports

**Adversarial Evaluation Mode:**
- Formal operator analysis
- Assumption challenges
- Edge cases identified
- Contradictions found
- Stress test results
- Improvement suggestions
- Better alternatives (if found)

## When to Use

**AI Evaluation:**
- Model evaluation
- Prompt optimization
- System assessment
- Performance analysis
- Benchmarking AI systems

**Adversarial Evaluation:**
- User presents a design
- Want to stress-test an approach
- Need to challenge assumptions
- Code review
- Architecture review
- Adversarial collaboration mode
- HALIRA Protocol evaluation

## Related

- Use `/prompt` for prompt engineering
- Use `/safety` for AI safety analysis
- Use `/attack` for solution attacks
- Use `/halira` for contradiction analysis
- See `.cursor/rules/general/adversarial-collaboration.mdc` for adversarial evaluation details
