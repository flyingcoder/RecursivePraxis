# Security policy

## Scope

RecursivePraxis executes model-host and optional tool-host integrations. Its security boundary includes capability grants, operator-specific tool allowlists, model/router output validation, resource budgets, redacted traces, and atomic local trace storage.

The project is experimental. A passing trace or replay result is not a guarantee that a model statement is true, that external evidence is authentic, or that an external tool side effect is safe.

## Reporting a vulnerability

Do not include credentials, raw task content, private trace files, or exploit payloads in a public issue. Report a suspected vulnerability privately to the repository maintainers through the project's configured private contact channel. Include:

- affected version or commit;
- minimal reproduction steps;
- expected and observed behavior;
- security impact; and
- whether any secrets, raw content, or external side effects are involved.

If no private contact channel is configured, ask a maintainer for one before sharing sensitive details.

## Security-relevant boundaries

- A tool call must be granted by the task capability set and permitted by the active operator's allowlist.
- Tool names, argument serialization, and timeouts are checked before dispatch.
- Router and model outputs are runtime-validated before entering a trace.
- Trace files retain hashes/metadata and abstract state, not the raw objective or artifact contents.
- Trace hashes detect accidental or ordinary modification, but are not signatures or an access-control mechanism.
- Tool hosts and model providers remain external trust boundaries; callers must grant the minimum capabilities required.

## Operational guidance

- Use the deterministic fake host for local development and tests.
- Do not grant `write`, `shell`, or `network` unless a task requires it.
- Store `.recursive-praxis/` on access-controlled storage; traces can contain sensitive metadata even when raw content is absent.
- Rotate provider credentials through the provider if exposure is suspected; do not write credentials into task objectives, traces, source files, or issues.
