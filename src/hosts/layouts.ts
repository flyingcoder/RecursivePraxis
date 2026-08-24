import path from "node:path";
import type { HostContext } from "../detect/context.js";
import type { FileKind } from "./types.js";
import type { WorkflowDefinition } from "../init/workflows.js";

/**
 * Where a host's package lives on disk.
 *
 * These are separate classes rather than one configurable shape because "a
 * plugin directory with a manifest", "loose files under a dot-directory", and
 * "a flat directory of command files" are genuinely different structures —
 * different file sets, different naming rules, and only one of them has a
 * manifest at all. Collapsing them into one class with three optional fields
 * would move the branching from the type system into every caller.
 */

export interface LayoutFile {
  readonly absPath: string;
  readonly kind: FileKind;
  /** The workflow this file carries, or undefined for a package manifest. */
  readonly workflowId: string | undefined;
  /** Frontmatter `name:` for a skill; undefined for commands and manifests. */
  readonly skillName: string | undefined;
  /** Fixed content, for files the layout authors itself rather than rendering. */
  readonly content: string | undefined;
}

export interface ManifestContext {
  /** CLI version, recorded so `doctor` and `sync` have a version to compare. */
  readonly version: string;
}

function skillDirName(workflowId: string): string {
  return `recursive-praxis-${workflowId}`;
}

export abstract class HostLayout {
  /** Absolute path of the directory this layout owns. */
  abstract readonly root: string;

  /** Package-level files with no workflow behind them. Empty for hosts with no manifest. */
  manifestFiles(_ctx: ManifestContext): readonly LayoutFile[] {
    return [];
  }

  abstract filesFor(workflow: WorkflowDefinition): readonly LayoutFile[];

  /**
   * Whether any file this layout would write already exists.
   *
   * Detection uses this to classify our own output as `already-initialized`
   * rather than as evidence of the host — otherwise `.agents/skills/`, which
   * is a directory *we* create, would make the tool detect itself.
   */
  ownsAnyExistingFile(ctx: HostContext, workflows: readonly WorkflowDefinition[]): boolean {
    return workflows.some((workflow) =>
      this.filesFor(workflow).some((file) => ctx.exists(file.absPath)),
    );
  }
}

/**
 * `<root>/<hostDir>/skills/recursive-praxis-<id>/SKILL.md`, plus an optional
 * command file whose path within `<hostDir>` the host decides. Covers Claude
 * Code at project scope, Cursor at both scopes, and Codex (skills only).
 */
export class StandaloneLayout extends HostLayout {
  readonly root: string;

  constructor(
    scopeRoot: string,
    private readonly hostDir: string,
    /** Path relative to `<hostDir>`, or undefined when the host has no command surface. */
    private readonly commandPath: ((workflowId: string) => string) | undefined,
  ) {
    super();
    this.root = path.join(scopeRoot, hostDir);
  }

  override filesFor(workflow: WorkflowDefinition): readonly LayoutFile[] {
    const files: LayoutFile[] = [
      {
        absPath: path.join(this.root, "skills", skillDirName(workflow.id), "SKILL.md"),
        kind: "skill",
        workflowId: workflow.id,
        skillName: skillDirName(workflow.id),
        content: undefined,
      },
    ];

    if (this.commandPath !== undefined) {
      files.push({
        absPath: path.join(this.root, this.commandPath(workflow.id)),
        kind: "command",
        workflowId: workflow.id,
        skillName: undefined,
        content: undefined,
      });
    }

    return files;
  }
}

/**
 * A Claude Code skills-directory plugin: `.claude-plugin/plugin.json` beside
 * `skills/<id>/SKILL.md`.
 *
 * At global scope this is strictly better than loose skill directories. It
 * auto-loads with no marketplace and no install step, namespaces every skill
 * under the plugin name instead of scattering siblings through
 * `~/.claude/skills/`, and its `version` field gives `doctor` and `sync`
 * something to compare against.
 *
 * The skill's frontmatter `name` is the bare workflow id here, because Claude
 * Code requires it to match the directory it was loaded from — which inside a
 * plugin is `skills/<id>/`, not `skills/recursive-praxis-<id>/`.
 */
export class PluginLayout extends HostLayout {
  constructor(
    readonly root: string,
    private readonly pluginName: string,
    private readonly description: string,
  ) {
    super();
  }

  override manifestFiles(ctx: ManifestContext): readonly LayoutFile[] {
    const manifest = {
      name: this.pluginName,
      description: this.description,
      version: ctx.version,
    };
    return [
      {
        absPath: path.join(this.root, ".claude-plugin", "plugin.json"),
        kind: "manifest",
        workflowId: undefined,
        skillName: undefined,
        content: `${JSON.stringify(manifest, null, 2)}\n`,
      },
    ];
  }

  override filesFor(workflow: WorkflowDefinition): readonly LayoutFile[] {
    return [
      {
        absPath: path.join(this.root, "skills", workflow.id, "SKILL.md"),
        kind: "skill",
        workflowId: workflow.id,
        skillName: workflow.id,
        content: undefined,
      },
    ];
  }
}

/**
 * A flat directory of command files: `<root>/praxis-<id>.md`. opencode reads
 * markdown commands with `description` frontmatter and takes the command name
 * from the filename; it has no skill surface at all, so it gets exactly one.
 */
export class CommandsOnlyLayout extends HostLayout {
  constructor(readonly root: string) {
    super();
  }

  override filesFor(workflow: WorkflowDefinition): readonly LayoutFile[] {
    return [
      {
        absPath: path.join(this.root, `praxis-${workflow.id}.md`),
        kind: "command",
        workflowId: workflow.id,
        skillName: undefined,
        content: undefined,
      },
    ];
  }
}
