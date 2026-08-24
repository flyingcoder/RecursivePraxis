Scenario: 
- Human ask to llm agent (orchestrator) human input = "We need our new deployment pipeline to be 100% automated with zero-touch delivery so developers can push code to production in under five minutes. But to stay compliant, we also need a senior engineer and a security specialist to manually review and sign off on every single change before it goes live."
- LLM agent (orchestrator or subagent) process human input and generate intent then ask lambda for operators sequence.
- Lambda run calculations then returns the operators sequence with meanings
- LLM agent (orchestrator or subagent) use operators sequence meanings to write a clear prompt like instructions based on human intent. 
