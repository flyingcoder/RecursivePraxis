#!/usr/bin/env node

import {
  allOperatorNames,
  formatAuthoredLambda,
  lookupOperator,
} from "./vocab/operators.js";
import { checkForbiddenSequence } from "./vocab/grammar.js";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
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
import { createAnthropicHost } from "./adapters/anthropic-transport.js";
import { createCursorHost } from "./adapters/cursor-transport.js";
import { createClaudeIdeHost } from "./adapters/claude-ide-transport.js";
import { createOllamaHost } from "./adapters/ollama-transport.js";
import { MODEL_HOST_IDS, Settings } from "./config/settings.js";
import {
  promoteExperimentalPolicy,
  runCapabilityBenchmark,
  type BenchmarkResult,
} from "./engine/evaluation.js";
import { runSense } from "./cli-commands/sense.js";
import { runStep } from "./cli-commands/step.js";
import { runStatus } from "./cli-commands/status.js";
import { runAnalyze } from "./cli-commands/analyze.js";
import { runCompile } from "./cli-commands/compile.js";
import { runSolve } from "./cli-commands/solve.js";
import { runDiagnose, listDiagnoseProblems } from "./cli-commands/diagnose.js";
import { runHalira } from "./cli-commands/halira.js";
import { runBind } from "./cli-commands/bind.js";
import { runIr } from "./cli-commands/ir.js";
import { runInit } from "./cli-commands/init.js";
import { record } from "./record/index.js";
import { validate } from "./validate/index.js";
import { score } from "./score/index.js";
import { revise } from "./revise/index.js";

/**
 * Read from package.json so `lambda --version` cannot drift from the
 * published package version. Resolves to the package root from `dist/cli.js`.
 */
const { version: VERSION } = createRequire(import.meta.url)("../package.json") as {
  version: string;
};
const SESSION_BASE_DIR = path.resolve(process.cwd(), ".recursive-praxis");

/**
 * The reserved verbs dispatch into their reserved modules rather than being
 * rejected by a string match here. Each module throws; the CLI turns that into
 * a non-zero exit. This keeps `src/{record,validate,score,revise}/index.ts`
 * load-bearing — deleting one breaks the fail-closed test — so the reserved
 * namespace documented in the requirements matrix is enforced rather than
 * merely claimed.
 *
 * They stay unimplemented deliberately: each would need a measurement
 * authority the runtime does not have. See docs/REQUIREMENTS_MATRIX.md and
 * docs/ALGEBRA_DYNAMICS_SEAM.md §4/§6.
 */
const RESERVED_VERBS = {
  record,
  validate,
  score,
  revise,
} as const satisfies Record<string, () => never>;

type ReservedVerb = keyof typeof RESERVED_VERBS;

function isReservedVerb(value: string): value is ReservedVerb {
  return Object.hasOwn(RESERVED_VERBS, value);
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
    "  lambda run [--host ollama|fake|anthropic|cursor|claude-ide] <task>",
    "  lambda inspect <task-id>",
    "  lambda replay <task-id>",
    "  lambda eval [--host ollama|fake|anthropic|cursor|claude-ide]",
    "  lambda promote <experimental-policy.json> <benchmark.json>",
    "  lambda status [--json]",
    "  lambda sense --d <n> --c <n> | --from <json> [--json]",
    "  lambda step [--op <Op>] [--json]",
    "  lambda analyze <Op[,Op…]> [--json]",
    "  lambda compile <Op[,Op…]> [--bindings <file>] [--json]",
    "  lambda solve --initial D,C --target D,C [--beam-width N] [--json]",
    "  lambda diagnose [<stuck|overwhelmed|rigid|collapsed|procrastinating>] [--json]",
    "  lambda halira start|next|status [--json]",
    "  lambda bind [--json]",
    "  lambda ir [--json]",
    "  lambda init --tools claude,cursor,codex | all | none",
    "              [--host ollama|fake|anthropic|cursor|claude-ide]",
    "              [--model <name>] [--ollama-url <url>] [--json]",
    "  lambda <verb>",
    "",
    "Vocabulary:",
    "  operators  — list / show the operator alphabet (authored λ)",
    "  check      — hard-reject forbidden operator sequences",
    "  plan       — build a deterministic, budgeted operator plan",
    "  run        — execute through the capability-gated model host",
    "               (defaults to the host configured by `lambda init`;",
    "               out of the box that is a local Ollama server)",
    "  inspect    — inspect a redacted local task trace",
    "  replay     — verify trace integrity and reproduce its plan",
    "  eval       — run the grounded multi-domain benchmark",
    "  promote    — promote an experimental policy from grounded results",
    "",
    "Kernel (dissipation solver, .recursive-praxis/session.json):",
    "  status     — attractor, V, D/C, λ_eff, mode, legalNext for the current session",
    "  sense      — set the session's D/C state directly",
    "  step       — apply one operator to the session (auto-picks if --op omitted)",
    "  analyze    — λ_eff / trajectory / warnings for an arbitrary sequence",
    "  compile    — compile a sequence into a cognitive execution program",
    "               (capability + budget per step; --bindings attaches the",
    "               model-authored domain bindings)",
    "  solve      — beam search from --initial to --target D,C",
    "  diagnose   — canned problem templates (run with no argument to list them)",
    "  halira     — Mode-2 escalation step machine (start | next | status)",
    "  bind       — finalize the session; fails closed without an anomaly artifact",
    "  ir         — print the current turn's instruction surface (legalNext only)",
    "",
    "Agent integrations:",
    "  init       — install: generate host-native Claude Code / Cursor / Codex",
    "               skill and command files that teach agents to call this CLI",
    "               (cognition only — no OpenSpec, no delivery workflow, no new",
    "               runtime), and record the model host / model settings in",
    "               .recursive-praxis/config.json. These settings are chosen",
    "               here and nowhere else; API keys stay in the environment.",
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

function failNotImplemented(verb: ReservedVerb): never {
  try {
    RESERVED_VERBS[verb]();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
  // Unreachable: every reserved module returns `never`. Retained so a module
  // that stops throwing still fails closed instead of silently succeeding.
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
      const op = lookupOperator(opName);
      console.log(op ? `${op.symbol}  ${opName}` : opName);
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
        `symbol: ${op.symbol}`,
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

function extractHostFlag(args: string[]): { host?: string | undefined; rest: string[] } {
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

function extractJsonFlag(args: string[]): { json: boolean; rest: string[] } {
  const rest = args.filter((value) => value !== "--json");
  return { json: rest.length !== args.length, rest };
}

/**
 * Loads the init-scoped configuration written by `lambda init`, plus any
 * secrets from the environment. Out of the box this resolves to local Ollama.
 */
async function loadSettings(): Promise<Settings> {
  return Settings.load({ cwd: process.cwd(), baseDir: SESSION_BASE_DIR });
}

/**
 * `--host` overrides the configured default for a single run; with the flag
 * omitted, the host chosen at init time is used.
 */
function resolveHost(host: string | undefined, settings: Settings): ModelHost {
  const id = host ?? settings.host();
  if (id === "ollama") return createOllamaHost(settings);
  if (id === "fake") return new DeterministicFakeModelHost();
  if (id === "anthropic") return createAnthropicHost(settings);
  if (id === "cursor") return createCursorHost(settings);
  if (id === "claude-ide") return createClaudeIdeHost(settings);
  console.error(`unknown host: ${id} (expected ${MODEL_HOST_IDS.join(", ")})`);
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
  const settings = await loadSettings();
  const state = createTaskState(taskFrom(rest, "run"));
  const trace = await runTask({
    state,
    capabilities: ["model", "read", "shell"],
    privacy: "metadata-only",
    policy: TRUSTED_POLICY,
    modelHost: resolveHost(host, settings),
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
    console.error(`usage: lambda eval [--host ${MODEL_HOST_IDS.join("|")}]`);
    process.exit(1);
  }
  const result = await runCapabilityBenchmark(resolveHost(host, await loadSettings()));
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

  if (first === "status") {
    const { json } = extractJsonFlag(rest);
    await runStatus(SESSION_BASE_DIR, json);
    return;
  }

  if (first === "sense") {
    const { json, rest: senseArgs } = extractJsonFlag(rest);
    await runSense(senseArgs, SESSION_BASE_DIR, json);
    return;
  }

  if (first === "step") {
    const { json, rest: stepArgs } = extractJsonFlag(rest);
    await runStep(stepArgs, SESSION_BASE_DIR, json);
    return;
  }

  if (first === "analyze") {
    const { json, rest: analyzeArgs } = extractJsonFlag(rest);
    if (analyzeArgs.length !== 1) {
      console.error('usage: lambda analyze "Ana,Meta,Non"');
      process.exit(1);
    }
    runAnalyze(analyzeArgs[0]!, json);
    return;
  }

  if (first === "compile") {
    const { json, rest: compileArgs } = extractJsonFlag(rest);
    await runCompile(compileArgs, json);
    return;
  }

  if (first === "solve") {
    const { json, rest: solveArgs } = extractJsonFlag(rest);
    runSolve(solveArgs, json);
    return;
  }

  if (first === "diagnose") {
    const { json, rest: diagnoseArgs } = extractJsonFlag(rest);
    if (diagnoseArgs.length === 0) {
      listDiagnoseProblems(json);
    } else {
      runDiagnose(diagnoseArgs[0]!, json);
    }
    return;
  }

  if (first === "halira") {
    const { json, rest: haliraArgs } = extractJsonFlag(rest);
    await runHalira(haliraArgs[0], SESSION_BASE_DIR, json);
    return;
  }

  if (first === "bind") {
    const { json, rest: bindArgs } = extractJsonFlag(rest);
    await runBind(bindArgs, SESSION_BASE_DIR, json);
    return;
  }

  if (first === "ir") {
    const { json } = extractJsonFlag(rest);
    await runIr(SESSION_BASE_DIR, json);
    return;
  }

  if (first === "init") {
    const { json, rest: initArgs } = extractJsonFlag(rest);
    await runInit(initArgs, process.cwd(), SESSION_BASE_DIR, json);
    return;
  }

  if (isReservedVerb(first!)) {
    failNotImplemented(first!);
  }

  failUnknown(first!);
}

main(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
