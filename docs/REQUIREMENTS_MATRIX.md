# RecursivePraxis requirements matrix

This is a documentation-only audit of the active product objective. “Verified” means the cited source exists and the stated behavior has direct test coverage; it does not mean the abstract formalism has been empirically validated as a measure of real-world reasoning quality.

| Objective requirement | Current mechanism | Evidence | Status | Boundary / deferred work |
| --- | --- | --- | --- | --- |
| Legal sequences of named cognitive operators | `Operator` alphabet, grammar, `legalNext`, `step` | `src/kernel/types.ts`, `session.ts`, `constraints.ts`; kernel and vocabulary tests | Verified | Operator meanings and transition effects are authored constants. |
| Inspectable reasoning state | Immutable `Session`, sequence, anomaly artifact, D/C state, attractor | `src/kernel/types.ts`, `phasePortrait.ts`, `cli-commands/status.ts` | Verified | The state is abstract; it is not a transcript of hidden model reasoning. |
| Dissipation and contradiction tracking | `DissipationState`, per-operator transition effects, Lyapunov/attractor classification | `src/kernel/phasePortrait.ts`, `dissipation.ts`; dissipation and phase-portrait tests | Verified | Values are not calibrated from observed agent outcomes. |
| Deterministic next-step choice | Beam solver toward fixed target; constrained Mode-2 recovery plan | `src/kernel/solver.ts`, `src/engine/core.ts` | Verified | Solver is deterministic for the supplied abstract state, not a proof of task success. |
| Validation of executed steps | Model output contract plus validator result/uncertainty gates | `src/engine/orchestrator.ts`; engine tests | Verified | Validator truthfulness depends on the selected host/validator. |
| Bounded recovery after failure | One Mode-1 replan, then HALIRA Mode 2 after two failures | `src/kernel/session.ts`, `halira.ts`, `src/engine/orchestrator.ts`; engine recovery test | Verified | Recovery is a prescribed operator program, not adaptive learning. |
| Completion rules | `bind` requires anomaly artifact, legal ending, and Mode-2 Recognition | `src/kernel/session.ts`; session and engine tests | Verified | Binding indicates formal completion, not independent human acceptance. |
| Typed outputs | TypeScript interfaces, Zod transport schemas, runtime guards | `src/adapters/schemas.ts`, `src/engine/orchestrator.ts`; engine tests | Verified | Direct custom hosts can still be untrusted; guards cover router/model outputs. |
| Budget enforcement | Token, cost, call, tool-call, latency budgets checked in planning and execution | `src/engine/core.ts`, `src/engine/orchestrator.ts`; engine tests | Verified | A remote model can consume resources before reporting a rejected overrun; the runtime fails closed after detection. |
| Capability restrictions | Capability grants, tool host presence, operator tool allowlists, argument/time checks | `src/engine/orchestrator.ts`; engine tool-denial test | Verified | Tool-capable operators do not require a tool; a requested tool is checked at use time. |
| Evidence references | Structured evidence references with allowed kind and SHA-256-shaped hash | `src/engine/core.ts`, `src/engine/orchestrator.ts`, `src/adapters/schemas.ts`; engine tests | Partially verified | Tool-host result evidence and optional artifact hashes are not yet runtime-validated before trace persistence. Hash syntax does not prove underlying content/provenance. |
| Redacted traces | Objective hash, no raw content, artifact hashes, atomic `0600` storage | `TaskTrace`, `FileTraceRepository`; CLI and engine tests | Verified | Metadata can still be sensitive in some deployment contexts; no configurable retention/redaction policy exists. |
| Replay verification | Trace hash plus semantic kernel replay of state, recovery, binding, attractor, mode | `verifyReplay` in `src/engine/orchestrator.ts`; engine tamper/recovery tests | Verified | It cannot re-run models/tools or independently establish evidence truth; trace hashes are not cryptographic signatures. |
| Practical runtime interfaces | CLI, fake host, Anthropic/Cursor/Claude IDE adapters, integration initializer | `src/cli.ts`, `src/adapters/`, `src/init/`; CLI/init tests | Verified | Provider behavior and credentials are outside local deterministic verification. |
| Evaluation and policy promotion | Three-domain benchmark and grounded promotion gate | `src/engine/evaluation.ts`; engine tests | Partially verified | Benchmark is small and authored; no automatic policy learning from production traces. |
| Cross-run memory and learning | N/A beyond one persisted kernel session | `src/cli-support/session-store.ts` | Not implemented | Episodic, semantic, procedural memory and validated learning promotion remain roadmap work. |
| `record`, `validate`, `score`, `revise` workflow | Explicit fail-closed reserved verbs | `src/{record,validate,score,revise}/index.ts`; fail-closed and CLI tests | Intentionally not implemented | They require separately scoped semantics and measurement authority. |

## Readiness conclusion

The present codebase satisfies the core *control-runtime* claim: it can govern a bounded sequence of typed, named, legal abstract reasoning operators and produce a redacted, semantically replayable trace. It does not yet satisfy stronger claims about autonomous learning, enduring memory, external-world evidence truth, or empirical cognitive improvement.

Before the next implementation phase, the most direct integrity improvement is to validate tool-host evidence and artifact hashes at the same boundary as model/router output. The most consequential product-expansion decisions are cross-run memory and what evidence/provenance model should justify `record`, `validate`, `score`, and `revise`.
