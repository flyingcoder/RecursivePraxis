import { parseToolsValue, TOOLS_FLAG_USAGE } from "../hosts/tools-flag.js";
import { CONFIG_FLAG_USAGE, parseConfigFlags } from "../init/config-flags.js";
import { InitWizard } from "../init/InitWizard.js";
import {
  FlagWizardIO,
  NeedsFlagError,
  PreAnsweredWizardIO,
  TtyWizardIO,
  type FlagAnswers,
  type WizardIO,
} from "../init/WizardIO.js";
import type { InitReport } from "../init/steps/GenerateStep.js";
import { WORKFLOWS } from "../init/workflows.js";
import { HostRegistry } from "../hosts/HostRegistry.js";
import { createHostContext } from "../detect/context.js";
import { isScope, SCOPES } from "../hosts/types.js";
import type { FileAction, FileWriteResult } from "../init/write.js";
import { INIT_SETTING_KEYS, Settings } from "../config/settings.js";

const VALUE_FLAGS = ["--tools", "--scope", "--host", "--model", "--ollama-url"] as const;

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

function printSummary(report: InitReport, config: ConfigSummary, json: boolean): void {
  if (json) {
    console.log(
      JSON.stringify(
        {
          tools: report.hosts.map((host) => host.hostId),
          scope: report.scope,
          config,
          manifest: report.manifestPath,
          files: report.files,
          hosts: report.hosts.map((host) => ({
            toolId: host.hostId,
            toolLabel: host.hostLabel,
            root: host.root,
            invocations: host.invocations,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

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

  if (report.hosts.length === 0) {
    console.log("no host agents selected — nothing written.");
    return;
  }

  for (const action of ACTION_ORDER) {
    const inBucket = report.files.filter((result: FileWriteResult) => result.action === action);
    if (inBucket.length === 0) continue;
    console.log(`${ACTION_LABEL[action]}:`);
    for (const result of inBucket) {
      console.log(`  ${result.displayPath}`);
    }
    console.log("");
  }

  console.log("Invoke with:");
  for (const host of report.hosts) {
    console.log(`  ${host.hostLabel}:`);
    for (const entry of host.invocations) {
      console.log(`    ${entry.invocation}`);
    }
  }

  if (report.manifestPath !== undefined) {
    console.log("");
    console.log(
      `Recorded in ${report.manifestPath} — \`lambda doctor\` verifies, \`lambda sync\` refreshes, \`lambda uninstall\` removes.`,
    );
  }
  console.log("");
  console.log(`Same result without prompts:  ${report.equivalentFlags}`);
}

/**
 * `lambda init` — install: pick host agents, pick a scope, generate.
 *
 * The `--tools` requirement is not removed, only made conditional on there
 * being nobody to ask. With a TTY the wizard runs and flags pre-answer their
 * step; without one, a missing `--tools` still exits non-zero naming the flag,
 * which is the same fail-closed posture as `Settings.require`. The wizard has
 * no private capability — anything it can do, a flag line can do, and it
 * prints that flag line on completion.
 */
export async function runInit(
  rest: string[],
  projectRoot: string,
  baseDir: string,
  json: boolean,
  version: string,
): Promise<void> {
  const { values, rest: remaining } = extractValueFlags(rest);

  if (remaining.length > 0) {
    console.error(`unexpected argument(s): ${remaining.join(" ")}. ${TOOLS_FLAG_USAGE}`);
    process.exit(1);
  }

  const answers: Record<string, readonly string[] | undefined> = {};

  const toolsValue = values["--tools"];
  if (toolsValue !== undefined) {
    const parsed = parseToolsValue(toolsValue);
    if (!parsed.ok) {
      console.error(parsed.error);
      process.exit(1);
    }
    answers["--tools"] = parsed.tools;
  }

  const scopeValue = values["--scope"];
  if (scopeValue !== undefined) {
    const scope = scopeValue.trim();
    if (!isScope(scope)) {
      console.error(`unknown scope: ${scopeValue} (expected ${SCOPES.join(" or ")})`);
      process.exit(1);
    }
    answers["--scope"] = [scope];
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

  // `--json` implies a machine reader, so it never prompts even on a TTY:
  // interleaving a wizard with a JSON document would corrupt both.
  const interactive = !json && process.stdin.isTTY === true && process.stdout.isTTY === true;
  const flagAnswers = answers as FlagAnswers;
  const io: WizardIO = interactive
    ? new PreAnsweredWizardIO(flagAnswers, new TtyWizardIO())
    : json
      ? new FlagWizardIO(flagAnswers)
      : new FlagWizardIO(flagAnswers, process.stdout);

  const ctx = createHostContext({ projectRoot });

  try {
    const report = await new InitWizard(
      HostRegistry.default(),
      ctx,
      io,
      WORKFLOWS,
      version,
    ).run();
    printSummary(report, summarizeConfig(settings, configPath, configFlags.changed), json);
    process.exit(0);
  } catch (error) {
    if (error instanceof NeedsFlagError) {
      console.error(`${error.message} ${TOOLS_FLAG_USAGE}`);
      process.exit(1);
    }
    throw error;
  }
}
