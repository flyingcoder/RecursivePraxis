import { buildPlan, type InitPlan } from "../init/plan.js";
import { parseToolsValue, TOOLS_FLAG_USAGE } from "../init/tools-flag.js";
import { CONFIG_FLAG_USAGE, parseConfigFlags } from "../init/config-flags.js";
import { writePlannedFile, type FileAction, type FileWriteResult } from "../init/write.js";
import type { ToolId } from "../init/targets.js";
import { INIT_SETTING_KEYS, Settings } from "../config/settings.js";

const VALUE_FLAGS = ["--tools", "--host", "--model", "--ollama-url"] as const;

type ValueFlag = (typeof VALUE_FLAGS)[number];

/** Pulls `--flag value` and `--flag=value` pairs out of the argument list. */
function extractValueFlags(args: string[]): {
  values: Partial<Record<ValueFlag, string>>;
  rest: string[];
} {
  const values: Partial<Record<ValueFlag, string>> = {};
  const rest: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    const flag = VALUE_FLAGS.find((candidate) => arg === candidate || arg.startsWith(`${candidate}=`));
    if (flag === undefined) {
      rest.push(arg);
      continue;
    }
    if (arg === flag) {
      const next = args[i + 1];
      if (next !== undefined) values[flag] = next;
      i += 1;
      continue;
    }
    values[flag] = arg.slice(flag.length + 1);
  }
  return { values, rest };
}

const ACTION_ORDER: readonly FileAction[] = ["created", "refreshed", "skipped", "preserved"];

const ACTION_LABEL: Record<FileAction, string> = {
  created: "created",
  refreshed: "refreshed (RecursivePraxis-managed content updated)",
  skipped: "skipped (not RecursivePraxis-managed — left untouched)",
  preserved: "preserved (already up to date)",
};

interface ConfigSummary {
  readonly settings: Readonly<Record<string, string>>;
  readonly sources: Readonly<Record<string, string>>;
  readonly path: string;
  readonly written: boolean;
}

function summarizeConfig(settings: Settings, configPath: string, written: boolean): ConfigSummary {
  const values: Record<string, string> = {};
  const sources: Record<string, string> = {};
  for (const key of INIT_SETTING_KEYS) {
    const value = settings.get(key);
    if (value === undefined) continue;
    values[key] = value;
    sources[key] = settings.sourceOf(key) === "default" ? "default" : "init";
  }
  return { settings: values, sources, path: configPath, written };
}

function printSummary(
  tools: readonly ToolId[],
  plan: InitPlan,
  results: readonly FileWriteResult[],
  config: ConfigSummary,
  json: boolean,
): void {
  if (json) {
    console.log(
      JSON.stringify(
        {
          tools,
          config,
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

  console.log(`Runtime configuration (${config.path}):`);
  for (const [key, value] of Object.entries(config.settings)) {
    console.log(`  ${key} = ${value}${config.sources[key] === "default" ? "  (default)" : ""}`);
  }
  console.log(
    config.written
      ? "  → written. These settings are set here only; re-run lambda init to change them."
      : "  → nothing written (no config flags passed). API keys stay in the environment.",
  );
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

export async function runInit(
  rest: string[],
  projectRoot: string,
  baseDir: string,
  json: boolean,
): Promise<void> {
  const { values, rest: remaining } = extractValueFlags(rest);

  if (remaining.length > 0) {
    console.error(`unexpected argument(s): ${remaining.join(" ")}. ${TOOLS_FLAG_USAGE}`);
    process.exit(1);
  }

  const toolsValue = values["--tools"];
  if (toolsValue === undefined) {
    console.error(
      `lambda init requires --tools — this CLI has no interactive tool selection. ${TOOLS_FLAG_USAGE}`,
    );
    process.exit(1);
  }

  const parsed = parseToolsValue(toolsValue);
  if (!parsed.ok) {
    console.error(parsed.error);
    process.exit(1);
  }

  // Config flags are resolved against the settings already on disk, so a
  // partial re-init (e.g. only --model) keeps every other choice intact.
  const current = await Settings.load({ cwd: projectRoot, baseDir });
  const configFlags = parseConfigFlags(
    { host: values["--host"], model: values["--model"], ollamaUrl: values["--ollama-url"] },
    current,
  );
  if (!configFlags.ok) {
    console.error(`${configFlags.error} ${CONFIG_FLAG_USAGE}`);
    process.exit(1);
  }

  const settings = current.with(configFlags.patch);
  const configPath = configFlags.changed ? await settings.save() : settings.configFilePath();

  const plan = buildPlan(parsed.tools);
  const results: FileWriteResult[] = [];
  for (const file of plan.files) {
    results.push(await writePlannedFile(projectRoot, file));
  }

  printSummary(
    parsed.tools,
    plan,
    results,
    summarizeConfig(settings, configPath, configFlags.changed),
    json,
  );
  process.exit(0);
}
