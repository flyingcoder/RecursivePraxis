import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  type BudgetUsage,
  type Capability,
  type EvidenceRef,
  type ObservableTaskState,
  type Plan,
  type PlanRequest,
  type PlanStep,
  budgetAllows,
  operatorContract,
  planHaliraRecoveryTask,
  planTask,
  remainingBudget,
} from "./core.js";
import {
  MODE2_GATE_THRESHOLD,
  bind as kernelBind,
  classifyAttractor,
  createInitialSession,
  haliraStart,
  haliraNext,
  recordMode1Failure,
  step as kernelStep,
  type AttractorLabel,
  type DissipationState,
  type Operator,
  type Session,
} from "../kernel/index.js";

export interface RoutingEvidence {
  readonly uncertainty: number;
  readonly contradictionDetected: boolean;
  readonly unresolvedClaims: readonly string[];
  readonly evidenceRefs: readonly EvidenceRef[];
}

export interface ModelStepInput {
  readonly taskId: string;
  readonly objective: string;
  readonly operator: Operator;
  readonly evidenceRefs: readonly EvidenceRef[];
  readonly maxTokens: number;
}

export interface ModelStepOutput {
  readonly summary: string;
  readonly evidenceRefs: readonly EvidenceRef[];
  readonly artifacts: readonly { mediaType: string; content: string }[];
  readonly usage: Pick<BudgetUsage, "tokens" | "costUsd" | "latencyMs">;
  readonly validatorPassed: boolean;
  readonly uncertainty: number;
  readonly requestedTools?: readonly ToolCall[] | undefined;
}

export interface ModelHost {
  readonly id: string;
  readonly version: string;
  route?(objective: string): Promise<RoutingEvidence>;
  execute(input: ModelStepInput): Promise<ModelStepOutput>;
}

export interface ToolCall {
  readonly name: string;
  readonly capability: Exclude<Capability, "model">;
  readonly args: Readonly<Record<string, unknown>>;
  readonly timeoutMs: number;
}

export interface ToolResult {
  readonly evidence: EvidenceRef;
  readonly artifactHash?: string;
  readonly durationMs: number;
}

export interface ToolHost {
  readonly id: string;
  call(call: ToolCall): Promise<ToolResult>;
}

export type TraceEvent =
  | { readonly type: "planned"; readonly planId: string; readonly at: string }
  | {
      readonly type: "decision";
      readonly operator: Operator;
      readonly action: "continue" | "replan" | "stop";
      readonly reason: string;
      readonly at: string;
    }
  | {
      readonly type: "step-completed";
      readonly operator: Operator;
      readonly evidenceRefs: readonly EvidenceRef[];
      readonly artifactHashes: readonly string[];
      readonly usage: BudgetUsage;
      readonly at: string;
    }
  | {
      readonly type: "bind";
      readonly result: "bound" | "rejected";
      readonly reason: string;
      readonly at: string;
    };

export interface TaskTrace {
  readonly schemaVersion: "1.1.0";
  readonly taskId: string;
  readonly objectiveHash: string;
  readonly rawContentIncluded: false;
  readonly policyVersion: string;
  readonly specVersion: string;
  readonly model: { readonly id: string; readonly version: string };
  readonly capabilities: readonly Capability[];
  readonly plan: Plan;
  readonly events: readonly TraceEvent[];
  readonly finalUsage: BudgetUsage;
  readonly status: "completed" | "stopped" | "failed" | "unbound";
  /** Abstract state only; no task content is retained in the trace. */
  readonly initialDissipation: DissipationState;
  readonly finalDissipation: DissipationState;
  readonly attractor: AttractorLabel;
  readonly bound: boolean;
  readonly haliraMode: 1 | 2;
  readonly traceHash: string;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function zeroUsage(): BudgetUsage {
  return { tokens: 0, costUsd: 0, calls: 0, toolCalls: 0, latencyMs: 0 };
}

function addUsage(current: BudgetUsage, delta: Partial<BudgetUsage>): BudgetUsage {
  return {
    tokens: current.tokens + (delta.tokens ?? 0),
    costUsd: current.costUsd + (delta.costUsd ?? 0),
    calls: current.calls + (delta.calls ?? 0),
    toolCalls: current.toolCalls + (delta.toolCalls ?? 0),
    latencyMs: current.latencyMs + (delta.latencyMs ?? 0),
  };
}

const EVIDENCE_KINDS = new Set([
  "input",
  "validator",
  "tool-result",
  "test",
  "human-acceptance",
  "domain-check",
]);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEvidenceRef(value: unknown): value is EvidenceRef {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.kind === "string" &&
    EVIDENCE_KINDS.has(value.kind) &&
    typeof value.hash === "string" &&
    /^[a-f0-9]{64}$/i.test(value.hash)
  );
}

function isToolCall(value: unknown): value is ToolCall {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.capability === "string" &&
    ["read", "write", "shell", "network"].includes(value.capability) &&
    isRecord(value.args) &&
    typeof value.timeoutMs === "number" &&
    Number.isFinite(value.timeoutMs)
  );
}

function isReportedUsage(
  value: unknown,
): value is Pick<BudgetUsage, "tokens" | "costUsd" | "latencyMs"> {
  return (
    isRecord(value) &&
    typeof value.tokens === "number" &&
    typeof value.costUsd === "number" &&
    typeof value.latencyMs === "number" &&
    Number.isFinite(value.tokens) &&
    Number.isFinite(value.costUsd) &&
    Number.isFinite(value.latencyMs) &&
    value.tokens >= 0 &&
    value.costUsd >= 0 &&
    value.latencyMs >= 0
  );
}

function validateStepOutput(output: unknown): output is ModelStepOutput {
  return (
    isRecord(output) &&
    typeof output.summary === "string" &&
    Array.isArray(output.evidenceRefs) &&
    output.evidenceRefs.every(isEvidenceRef) &&
    Array.isArray(output.artifacts) &&
    output.artifacts.every(
      (artifact) =>
        isRecord(artifact) &&
        typeof artifact.mediaType === "string" &&
        typeof artifact.content === "string",
    ) &&
    (output.requestedTools === undefined ||
      (Array.isArray(output.requestedTools) && output.requestedTools.every(isToolCall))) &&
    isReportedUsage(output.usage) &&
    typeof output.validatorPassed === "boolean" &&
    typeof output.uncertainty === "number" &&
    Number.isFinite(output.uncertainty) &&
    output.uncertainty >= 0 &&
    output.uncertainty <= 1
  );
}

function validateRoutingEvidence(routing: unknown): routing is RoutingEvidence {
  return (
    isRecord(routing) &&
    typeof routing.uncertainty === "number" &&
    Number.isFinite(routing.uncertainty) &&
    routing.uncertainty >= 0 &&
    routing.uncertainty <= 1 &&
    typeof routing.contradictionDetected === "boolean" &&
    Array.isArray(routing.unresolvedClaims) &&
    routing.unresolvedClaims.every((claim) => typeof claim === "string") &&
    Array.isArray(routing.evidenceRefs) &&
    routing.evidenceRefs.every(isEvidenceRef)
  );
}

export interface RunRequest extends PlanRequest {
  readonly modelHost: ModelHost;
  readonly toolHost?: ToolHost;
  readonly useRouter?: boolean;
}

export async function runTask(request: RunRequest): Promise<TaskTrace> {
  let state: ObservableTaskState = request.state;
  if (request.useRouter && request.modelHost.route) {
    const routingUsage: BudgetUsage = { ...zeroUsage(), calls: 1 };
    if (!budgetAllows(remainingBudget(state), routingUsage)) {
      throw new Error("router budget denied");
    }
    const routing = await request.modelHost.route(state.objective);
    if (!validateRoutingEvidence(routing)) {
      throw new Error("malformed routing output");
    }
    state = {
      ...state,
      uncertainty: routing.uncertainty,
      contradictionDetected: routing.contradictionDetected,
      unresolvedClaims: routing.unresolvedClaims,
      toolResults: [...state.toolResults, ...routing.evidenceRefs],
      usage: addUsage(state.usage, routingUsage),
    };
  }

  let plan = planTask({ ...request, state });
  const events: TraceEvent[] = [
    { type: "planned", planId: plan.id, at: new Date().toISOString() },
  ];
  let usage = state.usage;
  let status: TaskTrace["status"] = "completed";
  let pendingSteps = [...plan.steps];
  let kernelSession: Session = createInitialSession(state.dissipation);

  while (pendingSteps.length > 0) {
    const step = pendingSteps.shift()!;
    enforceCapabilities(step, request.capabilities);
    const estimate: BudgetUsage = {
      tokens: step.estimatedTokens,
      costUsd: step.estimatedCostUsd,
      calls: 1,
      toolCalls: 0,
      latencyMs: 10_000,
    };
    if (!budgetAllows(remainingBudget({ ...state, usage }), estimate)) {
      events.push(decision(step, "stop", "budget gate denied step"));
      status = "stopped";
      break;
    }

    const output = await request.modelHost.execute({
      taskId: state.taskId,
      objective: state.objective,
      operator: step.operator,
      evidenceRefs: [...state.toolResults, ...state.artifacts],
      maxTokens: Math.min(step.estimatedTokens, remainingBudget({ ...state, usage }).maxTokens),
    });
    if (!validateStepOutput(output)) {
      throw new Error(`malformed model output for ${step.operator}`);
    }
    // Estimates reserve capacity before a call, but the host's reported use is
    // authoritative for the hard gate.  Do not let an over-reporting host turn
    // a budgeted plan into an apparently successful overrun.
    const actualUsage: BudgetUsage = { ...output.usage, calls: 1, toolCalls: 0 };
    if (!budgetAllows(remainingBudget({ ...state, usage }), actualUsage)) {
      throw new Error(`model budget exceeded for ${step.operator}`);
    }
    usage = addUsage(usage, { ...output.usage, calls: 1 });

    // Advance the kernel session in lockstep with the executed plan step —
    // this should always be legal since planTask() only ever returns
    // grammar-accepted sequences, but a rejection here fails the task
    // closed rather than silently diverging session state from the trace.
    const stepped = kernelStep(kernelSession, step.operator);
    if (!stepped.ok) {
      events.push({
        type: "bind",
        result: "rejected",
        reason: stepped.error ?? "kernel step rejected",
        at: new Date().toISOString(),
      });
      status = "failed";
      break;
    }
    kernelSession = stepped.value;

    // Mode 2 is a deterministic recovery program rather than free-form
    // replanning.  Each completed corrective operator advances its program
    // counter; at step 7 only bind() may complete the session.
    if (kernelSession.mode === 2 && kernelSession.haliraStep < 7) {
      const advanced = haliraNext(kernelSession);
      if (!advanced.ok) {
        events.push({
          type: "bind",
          result: "rejected",
          reason: advanced.error ?? "HALIRA recovery could not advance",
          at: new Date().toISOString(),
        });
        status = "failed";
        break;
      }
      kernelSession = advanced.value;
    }

    const toolEvidence: EvidenceRef[] = [];
    const toolArtifactHashes: string[] = [];
    for (const toolCall of output.requestedTools ?? []) {
      validateToolCall(step, toolCall, request);
      if (!budgetAllows(remainingBudget({ ...state, usage }), {
        tokens: 0,
        costUsd: 0,
        calls: 0,
        toolCalls: 1,
        latencyMs: toolCall.timeoutMs,
      })) {
        throw new Error(`tool budget denied: ${toolCall.name}`);
      }
      const result = await request.toolHost!.call(toolCall);
      if (!Number.isFinite(result.durationMs) || result.durationMs < 0 || result.durationMs > toolCall.timeoutMs) {
        throw new Error(`invalid tool result duration: ${toolCall.name}`);
      }
      usage = addUsage(usage, { toolCalls: 1, latencyMs: result.durationMs });
      toolEvidence.push(result.evidence);
      if (result.artifactHash) toolArtifactHashes.push(result.artifactHash);
    }
    const artifactHashes = output.artifacts.map((artifact) =>
      hash(`${artifact.mediaType}\0${artifact.content}`)
    );
    events.push({
      type: "step-completed",
      operator: step.operator,
      evidenceRefs: [...output.evidenceRefs, ...toolEvidence],
      artifactHashes: [...artifactHashes, ...toolArtifactHashes],
      usage,
      at: new Date().toISOString(),
    });

    const failed = !output.validatorPassed || output.uncertainty >= 0.7;

    // First Mode-1 failure: exactly one conditional replan (mirrors the
    // prior replanCount === 0 gate), now tracked on the kernel session.
    if (failed && kernelSession.mode === 1 && kernelSession.mode1FailureCount === 0) {
      kernelSession = recordMode1Failure(kernelSession);
      events.push(
        decision(
          step,
          "replan",
          output.validatorPassed ? "uncertainty threshold exceeded" : "validator failed",
        ),
      );
      state = {
        ...state,
        failedChecks: output.validatorPassed
          ? state.failedChecks
          : [...state.failedChecks, `${step.operator}:validator`],
        uncertainty: output.uncertainty,
        usage,
        dissipation: kernelSession.state,
      };
      plan = planTask({ ...request, state });
      pendingSteps = [...plan.steps];
      events.push({ type: "planned", planId: plan.id, at: new Date().toISOString() });
      continue;
    }

    // A second (or later) Mode-1 failure escalates into HALIRA Mode 2 once
    // the recorded-failure gate is met, instead of replanning indefinitely.
    if (failed && kernelSession.mode === 1 && kernelSession.mode1FailureCount >= 1) {
      kernelSession = recordMode1Failure(kernelSession);
      if (kernelSession.mode1FailureCount >= MODE2_GATE_THRESHOLD) {
        const escalated = haliraStart(kernelSession);
        if (escalated.ok) {
          kernelSession = escalated.value;
          events.push(
            decision(step, "replan", "HALIRA mode-2 escalation after repeated Mode-1 failures"),
          );
          state = { ...state, uncertainty: output.uncertainty, usage, dissipation: kernelSession.state };
          plan = planHaliraRecoveryTask({ ...request, state }, kernelSession.haliraStep);
          pendingSteps = [...plan.steps];
          events.push({ type: "planned", planId: plan.id, at: new Date().toISOString() });
          continue;
        }
      }
      events.push(decision(step, "continue", "validator failed (HALIRA mode-2 gate not yet met)"));
      continue;
    }

    events.push(decision(step, "continue", "validated structured output"));
  }

  let bound = false;
  if (status === "completed") {
    const finalized = kernelBind(kernelSession);
    if (finalized.ok) {
      kernelSession = finalized.value;
      bound = true;
      events.push({
        type: "bind",
        result: "bound",
        reason: "sequence carries an anomaly artifact and does not end on Ana",
        at: new Date().toISOString(),
      });
    } else {
      status = "unbound";
      events.push({
        type: "bind",
        result: "rejected",
        reason: finalized.error ?? "kernel bind rejected",
        at: new Date().toISOString(),
      });
    }
  }

  const unsigned = {
    schemaVersion: "1.1.0" as const,
    taskId: state.taskId,
    objectiveHash: hash(state.objective),
    rawContentIncluded: false as const,
    policyVersion: request.policy.version,
    specVersion: plan.specVersion,
    model: { id: request.modelHost.id, version: request.modelHost.version },
    capabilities: request.capabilities,
    plan,
    events,
    finalUsage: usage,
    status,
    initialDissipation: request.state.dissipation,
    finalDissipation: kernelSession.state,
    attractor: classifyAttractor(kernelSession.state.D, kernelSession.state.C),
    bound,
    haliraMode: kernelSession.mode,
  };
  return { ...unsigned, traceHash: hash(JSON.stringify(unsigned)) };
}

function decision(
  step: PlanStep,
  action: "continue" | "replan" | "stop",
  reason: string,
): TraceEvent {
  return { type: "decision", operator: step.operator, action, reason, at: new Date().toISOString() };
}

function enforceCapabilities(step: PlanStep, grants: readonly Capability[]): void {
  const allowed = new Set(grants);
  for (const required of step.requiredCapabilities) {
    if (!allowed.has(required)) throw new Error(`capability denied: ${required}`);
  }
}

function validateToolCall(
  step: PlanStep,
  call: ToolCall,
  request: RunRequest,
): void {
  if (!request.toolHost) throw new Error(`tool host unavailable: ${call.name}`);
  if (!request.capabilities.includes(call.capability)) {
    throw new Error(`capability denied: ${call.capability}`);
  }
  if (!operatorContract(step.operator).allowedTools.includes(call.name)) {
    throw new Error(`tool denied for ${step.operator}: ${call.name}`);
  }
  // Authored safety ceiling for a single tool invocation.
  if (
    !/^[a-z][a-z0-9-]*$/.test(call.name) ||
    call.timeoutMs <= 0 ||
    call.timeoutMs > 30_000
  ) {
    throw new Error(`invalid tool call: ${call.name}`);
  }
  const serialized = JSON.stringify(call.args);
  if (serialized.includes("\u0000") || serialized.includes("../")) {
    throw new Error(`unsafe tool arguments: ${call.name}`);
  }
}

export class FileTraceRepository {
  readonly directory: string;

  constructor(directory: string) {
    this.directory = directory;
  }

  async save(trace: TaskTrace): Promise<string> {
    await mkdir(this.directory, { recursive: true });
    const target = path.join(this.directory, `${trace.taskId}.json`);
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(trace, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporary, target);
    return target;
  }

  async load(taskId: string): Promise<TaskTrace> {
    if (!/^[a-zA-Z0-9_-]+$/.test(taskId)) throw new Error("invalid task id");
    const text = await readFile(path.join(this.directory, `${taskId}.json`), "utf8");
    return JSON.parse(text) as TaskTrace;
  }
}

function sameDissipation(a: DissipationState, b: DissipationState): boolean {
  return Object.is(a.D, b.D) && Object.is(a.C, b.C);
}

function replaySemantics(trace: TaskTrace): readonly string[] {
  const reasons: string[] = [];
  if (trace.schemaVersion !== "1.1.0") {
    return ["unsupported trace schema; semantic replay requires 1.1.0"];
  }
  if (
    !Number.isFinite(trace.initialDissipation.D) ||
    !Number.isFinite(trace.initialDissipation.C) ||
    !Number.isFinite(trace.finalDissipation.D) ||
    !Number.isFinite(trace.finalDissipation.C)
  ) {
    return ["trace contains non-finite dissipation state"];
  }

  let session = createInitialSession(trace.initialDissipation);
  let sawTerminalBind = false;
  for (let index = 0; index < trace.events.length; index += 1) {
    const event = trace.events[index]!;
    if (event.type === "planned") {
      if (!event.planId) reasons.push("planned event has no plan id");
      continue;
    }
    if (event.type === "bind") {
      sawTerminalBind = true;
      continue;
    }
    if (event.type === "decision") {
      if (event.action === "stop" && trace.status !== "stopped") {
        reasons.push("stop decision conflicts with non-stopped trace status");
      }
      continue;
    }

    const stepped = kernelStep(session, event.operator);
    if (!stepped.ok) {
      reasons.push(`recorded operator ${event.operator} is illegal during replay`);
      break;
    }
    session = stepped.value;
    if (session.mode === 2 && session.haliraStep < 7) {
      const advanced = haliraNext(session);
      if (!advanced.ok) {
        reasons.push(advanced.error ?? "HALIRA recovery could not advance during replay");
        break;
      }
      session = advanced.value;
    }

    const decisionEvent = trace.events[index + 1];
    if (!decisionEvent || decisionEvent.type !== "decision" || decisionEvent.operator !== event.operator) {
      reasons.push(`step ${event.operator} is not followed by its recorded decision`);
      continue;
    }
    if (decisionEvent.action === "replan") {
      if (session.mode !== 1) {
        reasons.push(`replan after ${event.operator} occurred outside Mode 1`);
      } else {
        session = recordMode1Failure(session);
        if (decisionEvent.reason === "HALIRA mode-2 escalation after repeated Mode-1 failures") {
          const escalated = haliraStart(session);
          if (!escalated.ok) reasons.push(escalated.error ?? "HALIRA escalation failed during replay");
          else session = escalated.value;
        }
      }
    }
  }

  const terminalBind = trace.events.filter((event) => event.type === "bind").at(-1);
  if (trace.status === "completed") {
    const bound = kernelBind(session);
    if (!bound.ok || !trace.bound || terminalBind?.result !== "bound") {
      reasons.push("completed trace does not reproduce a successful bind");
    } else {
      session = bound.value;
    }
  } else if (trace.status === "unbound") {
    if (kernelBind(session).ok || trace.bound || terminalBind?.result !== "rejected") {
      reasons.push("unbound trace does not reproduce a rejected bind");
    }
  } else if (trace.bound || sawTerminalBind) {
    reasons.push("non-terminal trace reports binding activity");
  }

  if (!sameDissipation(session.state, trace.finalDissipation)) {
    reasons.push("final dissipation does not match deterministic replay");
  }
  if (classifyAttractor(session.state.D, session.state.C) !== trace.attractor) {
    reasons.push("recorded attractor does not match deterministic replay");
  }
  if (session.bound !== trace.bound) reasons.push("recorded bound state does not match deterministic replay");
  if (session.mode !== trace.haliraMode) reasons.push("recorded HALIRA mode does not match deterministic replay");
  return reasons;
}

export function verifyReplay(trace: TaskTrace): {
  readonly reproducible: boolean;
  readonly plan: Plan;
  readonly eventCount: number;
  readonly reasons: readonly string[];
} {
  const { traceHash, ...unsigned } = trace;
  const reasons = [
    ...(hash(JSON.stringify(unsigned)) === traceHash ? [] : ["trace hash does not match content"]),
    ...replaySemantics(trace),
  ];
  return {
    reproducible: reasons.length === 0,
    plan: trace.plan,
    eventCount: trace.events.length,
    reasons,
  };
}
