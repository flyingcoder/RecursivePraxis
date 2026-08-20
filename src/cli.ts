#!/usr/bin/env node

import {
  allOperatorNames,
  formatAuthoredLambda,
  lookupOperator,
} from "./vocab/operators.js";
import { checkForbiddenSequence } from "./vocab/grammar.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  TRUSTED_POLICY,
  createTaskState,
  planTask,
  type PolicyProfile,
} from "./engine/core.js";
import {
  FileTraceRepository,
  runTask,
  verifyReplay,
  type ModelHost,
  type TaskTrace,
} from "./engine/orchestrator.js";
import { DeterministicFakeModelHost } from "./adapters/model-hosts.js";
import { createAnthropicHostFromEnv } from "./adapters/anthropic-transport.js";
import { createCursorHostFromEnv } from "./adapters/cursor-transport.js";
import { createClaudeIdeHostFromEnv } from "./adapters/claude-ide-transport.js";
import {
  promoteExperimentalPolicy,
  runCapabilityBenchmark,
  type BenchmarkResult,
} from "./engine/evaluation.js";

const VERSION = "0.0.0";

const RESERVED_VERBS = ["record", "validate", "score", "revise"] as const;

type ReservedVerb = (typeof RESERVED_VERBS)[number];

function isReservedVerb(value: string): value is ReservedVerb {
  return (RESERVED_VERBS as readonly string[]).includes(value);
}

function printHelp(): void {
  const lines = [
    "lambda — RecursivePraxis CLI",
    "",
    "Usage:",
    "  lambda --help | -h",
    "  lambda --version | -v",
    "  lambda operators list",
    "  lambda operators show <Op>",
    "  lambda check <Op> [<Op>…]",
    "  lambda plan <task>",
    "  lambda run [--host fake|anthropic|cursor|claude-ide] <task>",
    "  lambda inspect <task-id>",
    "  lambda replay <task-id>",
    "  lambda eval [--host fake|anthropic|cursor|claude-ide]",
    "  lambda promote <experimental-policy.json> <benchmark.json>",
    "  lambda <verb>",
    "",
    "Vocabulary:",
    "  operators  — list / show CORE alphabet (authored λ)",
    "  check      — hard-reject CORE forbidden sequences",
    "  plan       — build a deterministic, budgeted operator plan",
    "  run        — execute through the capability-gated model host",
    "  inspect    — inspect a redacted local task trace",
    "  replay     — verify trace integrity and reproduce its plan",
    "  eval       — run the grounded multi-domain benchmark",
    "  promote    — promote an experimental policy from grounded results",
    "",
    "Reserved verbs (not implemented):",
    "  record    — not implemented",
    "  validate  — not implemented",
    "  score     — not implemented",
    "  revise    — not implemented",
    "",
    "Fail-closed: reserved verbs and unimplemented surfaces exit non-zero",
    "and emit no scores or quarry λ_effective.",
  ];
  console.log(lines.join("\n"));
}

function printVersion(): void {
  console.log(VERSION);
}

function failNotImplemented(verb: string): never {
  console.error(`${verb} is not implemented`);
  process.exit(1);
}

function failUnknown(command: string): never {
  console.error(`unknown command: ${command}`);
  process.exit(1);
}

function runOperators(args: string[]): void {
  const [action, name, ...rest] = args;

  if (action === "list") {
    if (rest.length > 0 || name !== undefined) {
      console.error("usage: lambda operators list");
      process.exit(1);
    }
    for (const opName of allOperatorNames()) {
      console.log(opName);
    }
    process.exit(0);
  }

  if (action === "show") {
    if (!name || rest.length > 0) {
      console.error("usage: lambda operators show <Op>");
      process.exit(1);
    }
    const op = lookupOperator(name);
    if (!op) {
      console.error(`unknown operator: ${name}`);
      process.exit(1);
    }
    console.log(
      [
        `name: ${op.name}`,
        `class: ${op.className}`,
        formatAuthoredLambda(op),
      ].join("\n"),
    );
    process.exit(0);
  }

  console.error("usage: lambda operators list | show <Op>");
  process.exit(1);
}

function runCheck(rawOps: string[]): void {
  if (rawOps.length === 0) {
    console.error("usage: lambda check <Op> [<Op>…]");
    process.exit(1);
  }

  const resolved: string[] = [];
  for (const raw of rawOps) {
    const op = lookupOperator(raw);
    if (!op) {
      console.error(`unknown operator: ${raw}`);
      process.exit(1);
    }
    resolved.push(op.name);
  }

  const result = checkForbiddenSequence(resolved);
  if (result.accepted) {
    console.log(`accept: ${resolved.join(" → ")}`);
    process.exit(0);
  }

  console.error(`${result.reason} [${result.constraint}]`);
  process.exit(1);
}

const traceRepository = new FileTraceRepository(
  path.resolve(process.cwd(), ".recursive-praxis/traces"),
);

function taskFrom(args: string[], command: string): string {
  const objective = args.join(" ").trim();
  if (!objective) {
    console.error(`usage: lambda ${command} <task>`);
    process.exit(1);
  }
  return objective;
}

function extractHostFlag(args: string[]): { host?: string; rest: string[] } {
  const rest: string[] = [];
  let host: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const value = args[i]!;
    if (value === "--host") {
      host = args[i + 1];
      i += 1;
      continue;
    }
    if (value.startsWith("--host=")) {
      host = value.slice("--host=".length);
      continue;
    }
    rest.push(value);
  }
  return { host, rest };
}

function resolveHost(host: string | undefined): ModelHost {
  if (host === undefined || host === "fake") return new DeterministicFakeModelHost();
  if (host === "anthropic") return createAnthropicHostFromEnv();
  if (host === "cursor") return createCursorHostFromEnv();
  if (host === "claude-ide") return createClaudeIdeHostFromEnv();
  console.error(`unknown host: ${host} (expected fake, anthropic, cursor, or claude-ide)`);
  process.exit(1);
}

function runPlan(args: string[]): void {
  const state = createTaskState(taskFrom(args, "plan"));
  const plan = planTask({
    state,
    capabilities: ["model", "read", "shell"],
    privacy: "metadata-only",
    policy: TRUSTED_POLICY,
  });
  console.log(JSON.stringify(plan, null, 2));
}

async function runExecution(args: string[]): Promise<void> {
  const { host, rest } = extractHostFlag(args);
  const state = createTaskState(taskFrom(rest, "run"));
  const trace = await runTask({
    state,
    capabilities: ["model", "read", "shell"],
    privacy: "metadata-only",
    policy: TRUSTED_POLICY,
    modelHost: resolveHost(host),
    useRouter: true,
  });
  const location = await traceRepository.save(trace);
  console.log(
    JSON.stringify(
      { taskId: trace.taskId, status: trace.status, trace: location, usage: trace.finalUsage },
      null,
      2,
    ),
  );
}

async function runInspect(args: string[]): Promise<void> {
  if (args.length !== 1) {
    console.error("usage: lambda inspect <task-id>");
    process.exit(1);
  }
  console.log(JSON.stringify(await traceRepository.load(args[0]!), null, 2));
}

async function runReplay(args: string[]): Promise<void> {
  if (args.length !== 1) {
    console.error("usage: lambda replay <task-id>");
    process.exit(1);
  }
  const result = verifyReplay(await traceRepository.load(args[0]!));
  console.log(JSON.stringify(result, null, 2));
  if (!result.reproducible) process.exit(1);
}

async function runEval(args: string[]): Promise<void> {
  const { host, rest } = extractHostFlag(args);
  if (rest.length !== 0) {
    console.error("usage: lambda eval [--host fake|anthropic|cursor|claude-ide]");
    process.exit(1);
  }
  const result = await runCapabilityBenchmark(resolveHost(host));
  console.log(JSON.stringify(result, null, 2));
}

async function runPromote(args: string[]): Promise<void> {
  if (args.length !== 2) {
    console.error("usage: lambda promote <experimental-policy.json> <benchmark.json>");
    process.exit(1);
  }
  const [policyText, benchmarkText] = await Promise.all([
    readFile(path.resolve(args[0]!), "utf8"),
    readFile(path.resolve(args[1]!), "utf8"),
  ]);
  const result = promoteExperimentalPolicy(
    JSON.parse(policyText) as PolicyProfile,
    JSON.parse(benchmarkText) as BenchmarkResult,
  );
  console.log(JSON.stringify(result, null, 2));
}

async function main(argv: string[]): Promise<void> {
  const args = argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const [first, ...rest] = args;

  if (first === "--help" || first === "-h") {
    printHelp();
    process.exit(0);
  }

  if (first === "--version" || first === "-v") {
    printVersion();
    process.exit(0);
  }

  if (first === "operators") {
    runOperators(rest);
  }

  if (first === "check") {
    runCheck(rest);
  }

  if (first === "plan") {
    runPlan(rest);
    return;
  }

  if (first === "run") {
    await runExecution(rest);
    return;
  }

  if (first === "inspect") {
    await runInspect(rest);
    return;
  }

  if (first === "replay") {
    await runReplay(rest);
    return;
  }

  if (first === "eval") {
    await runEval(rest);
    return;
  }

  if (first === "promote") {
    await runPromote(rest);
    return;
  }

  if (first === "sequence") {
    failNotImplemented("sequence");
  }

  if (isReservedVerb(first)) {
    failNotImplemented(first);
  }

  failUnknown(first!);
}

main(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
