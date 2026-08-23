import { readFile } from "node:fs/promises";
import type { Operator } from "../kernel/index.js";
import { parseOperatorSequence } from "../cli-support/parse.js";
import {
  bindExecutionProgram,
  bindingRequests,
  compileExecutionProgram,
  renderExecutionProgramMarkdown,
  type ExecutionProgram,
} from "../ir/execution.js";

function extractBindingsFlag(rest: string[]): { bindings?: string; rest: string[] } {
  const remaining: string[] = [];
  let bindings: string | undefined;
  for (let i = 0; i < rest.length; i += 1) {
    const value = rest[i]!;
    if (value === "--bindings") {
      bindings = rest[++i];
      continue;
    }
    remaining.push(value);
  }
  return bindings === undefined ? { rest: remaining } : { bindings, rest: remaining };
}

async function loadBindings(filePath: string): Promise<Record<string, unknown>> {
  const raw = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(
      `--bindings must be a JSON object keyed by instruction index, got ${Array.isArray(raw) ? "array" : typeof raw}`,
    );
  }
  return raw as Record<string, unknown>;
}

export async function runCompile(rest: string[], json: boolean): Promise<void> {
  const { bindings: bindingsPath, rest: args } = extractBindingsFlag(rest);
  if (args.length !== 1) {
    console.error('usage: lambda compile "Axis,Crux,Ana" [--bindings <file>] [--json]');
    process.exit(1);
  }

  let program: ExecutionProgram;
  try {
    const sequence: readonly Operator[] = parseOperatorSequence(args[0]!);
    const compiled = compileExecutionProgram(sequence);
    program = bindingsPath
      ? bindExecutionProgram(compiled, await loadBindings(bindingsPath))
      : compiled;
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }

  if (json) {
    console.log(JSON.stringify({ ...program, bindingRequests: bindingRequests(program) }, null, 2));
    process.exit(0);
  }

  console.log(renderExecutionProgramMarkdown(program));
  process.exit(0);
}
