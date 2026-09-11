# /init-session Command

## Description

Manually initialize a new chat session with context loading and setup. Use this as an alternative to automatic hooks if you prefer manual control.

## Usage

```bash
/init-session
```

## What It Does

1. **Load Project Context**
   - Current git branch and status
   - Recent file changes
   - Active file context

2. **Initialize Lambda Engine**
   - Detect current mode (Mode 1 or Mode 2)
   - Set up operator sequences
   - Establish phase space state

3. **Set Up Environment**
   - Load relevant rules
   - Initialize operator state
   - Prepare tool selection patterns

4. **Session Tracking**
   - Create session log
   - Track session metadata
   - Enable feedback collection

## Examples

```bash
# Initialize session manually
/init-session

# Session will load context and prepare for work
```

## When to Use

- When you want manual control over session initialization
- If hooks are not working or disabled
- For debugging session setup
- When you need custom initialization logic

## Related

- See `.cursor/hooks/chat-session-init.sh` for automatic initialization
- See `.cursor/hooks.json` for hooks configuration

