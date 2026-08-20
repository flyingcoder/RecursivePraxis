import { buildPlan, type InitPlan } from "../init/plan.js";
import { parseToolsValue, TOOLS_FLAG_USAGE } from "../init/tools-flag.js";
import { writePlannedFile, type FileAction, type FileWriteResult } from "../init/write.js";
import type { ToolId } from "../init/targets.js";

function extractToolsFlag(args: string[]): { value: string | undefined; rest: string[] } {
  const rest: string[] = [];
  let value: string | undefined;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (arg === "--tools") {
      value = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--tools=")) {
      value = arg.slice("--tools=".length);
      continue;
    }
    rest.push(arg);
  }
  return { value, rest };
}

const ACTION_ORDER: readonly FileAction[] = ["created", "refreshed", "skipped", "preserved"];

const ACTION_LABEL: Record<FileAction, string> = {
  created: "created",
  refreshed: "refreshed (RecursivePraxis-managed content updated)",
  skipped: "skipped (not RecursivePraxis-managed — left untouched)",
  preserved: "preserved (already up to date)",
};

function printSummary(tools: readonly ToolId[], plan: InitPlan, results: readonly FileWriteResult[], json: boolean): void {
  if (json) {
    console.log(
      JSON.stringify(
        {
          tools,
          files: results,
          hosts: plan.hosts.map((host) => ({
            toolId: host.toolId,
            toolLabel: host.toolLabel,
            invocations: host.invocations,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log("RecursivePraxis agent integrations");
  console.log("");

  if (tools.length === 0) {
    console.log("no tools selected (--tools none) — nothing written.");
    return;
  }

  for (const action of ACTION_ORDER) {
    const inBucket = results.filter((result) => result.action === action);
    if (inBucket.length === 0) continue;
    console.log(`${ACTION_LABEL[action]}:`);
    for (const result of inBucket) {
      console.log(`  ${result.relPath}`);
    }
    console.log("");
  }

  console.log("Invocation:");
  for (const host of plan.hosts) {
    console.log(`  ${host.toolLabel}:`);
    for (const entry of host.invocations) {
      console.log(`    ${entry.invocation}`);
    }
  }
}

export async function runInit(rest: string[], projectRoot: string, json: boolean): Promise<void> {
  const { value, rest: remaining } = extractToolsFlag(rest);

  if (remaining.length > 0) {
    console.error(`unexpected argument(s): ${remaining.join(" ")}. ${TOOLS_FLAG_USAGE}`);
    process.exit(1);
  }

  if (value === undefined) {
    console.error(
      `lambda init requires --tools — this CLI has no interactive tool selection. ${TOOLS_FLAG_USAGE}`,
    );
    process.exit(1);
  }

  const parsed = parseToolsValue(value);
  if (!parsed.ok) {
    console.error(parsed.error);
    process.exit(1);
  }

  const plan = buildPlan(parsed.tools);
  const results: FileWriteResult[] = [];
  for (const file of plan.files) {
    results.push(await writePlannedFile(projectRoot, file));
  }

  printSummary(parsed.tools, plan, results, json);
  process.exit(0);
}
