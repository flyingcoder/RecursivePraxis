import path from "node:path";
import type { HostContext } from "../detect/context.js";
import {
  autoSelects,
  rankConfidence,
  type Confidence,
  type HostSignal,
} from "../detect/signals.js";
import type { DocumentPipeline } from "../render/DocumentPipeline.js";
import type { WorkflowDefinition } from "../init/workflows.js";
import type { HostLayout } from "./layouts.js";
import type { FileKind, HostId, InvocationResolver, Scope } from "./types.js";

export interface HostDetection {
  readonly hostId: HostId;
  readonly label: string;
  readonly signals: readonly HostSignal[];
  readonly confidence: Confidence;
  /** Whether Step 2 starts with this host's box checked. Never a decision to write. */
  readonly defaultSelected: boolean;
  /** True when the only evidence at project scope is our own generated output. */
  readonly alreadyInitialized: boolean;
}

export interface PlannedFile {
  readonly hostId: HostId;
  readonly hostLabel: string;
  readonly workflowId: string | undefined;
  readonly kind: FileKind;
  readonly absPath: string;
  /** Relative to the scope root — the project root, or the home directory. */
  readonly relPath: string;
  /** How the path is shown to a human: `~/…` at global scope, as-is at project scope. */
  readonly displayPath: string;
  readonly content: string;
}

export interface PlanOptions {
  readonly version: string;
}

/**
 * One host agent: how to detect it, where its files go, how they are
 * rendered, and how a human invokes them.
 *
 * These four things are what actually differ per host, and putting them on
 * one object is the point: a fifth host is a new file plus a line in the
 * registry, and `parseToolsValue`, the wizard, `doctor`, `sync`, and
 * `uninstall` need no edits at all. The previous shape — a record of object
 * literals — had nowhere to hang detection or per-scope paths, so each would
 * have grown a parallel record beside it.
 */
export abstract class HostAdapter implements InvocationResolver {
  abstract readonly id: HostId;
  abstract readonly label: string;
  /**
   * The vendor release whose documentation the paths in `layout()` were
   * checked against. Host layouts drift between releases, so `doctor` reports
   * this rather than leaving a wrong path to look like a working one.
   */
  abstract readonly verifiedAgainst: string;

  /** Step 1: raw evidence. Contributes facts; decides nothing. */
  protected abstract probes(ctx: HostContext): readonly HostSignal[];

  /** Step 4: where this host's package lives at this scope. */
  abstract layout(ctx: HostContext, scope: Scope): HostLayout;

  /** Step 4: how a workflow becomes this host's file. */
  abstract pipeline(scope: Scope): DocumentPipeline;

  /** What the human types once it is installed. */
  abstract invocation(workflowId: string, scope: Scope): string;

  /**
   * Ranks this host's evidence. Not overridden by any adapter, deliberately:
   * a host supplies signals and the ladder in `src/detect/signals.ts` ranks
   * them, so every row of the Step 1 table means the same thing.
   */
  detect(ctx: HostContext, workflows: readonly WorkflowDefinition[]): HostDetection {
    const signals = this.probes(ctx);
    return {
      hostId: this.id,
      label: this.label,
      signals,
      confidence: rankConfidence(signals),
      defaultSelected: autoSelects(signals),
      alreadyInitialized: this.layout(ctx, "project").ownsAnyExistingFile(ctx, workflows),
    };
  }

  /** Every file this host would write at this scope, content included. */
  plan(
    workflows: readonly WorkflowDefinition[],
    ctx: HostContext,
    scope: Scope,
    options: PlanOptions,
  ): readonly PlannedFile[] {
    const layout = this.layout(ctx, scope);
    const render = this.pipeline(scope);
    const scopeRoot = scopeRootFor(ctx, scope);

    const files: PlannedFile[] = [];

    for (const file of layout.manifestFiles({ version: options.version })) {
      files.push(this.toPlanned(file, scopeRoot, scope, file.content ?? ""));
    }

    for (const workflow of workflows) {
      for (const file of layout.filesFor(workflow)) {
        const content =
          file.content ??
          render.render(workflow, {
            kind: file.kind === "command" ? "command" : "skill",
            name: file.skillName,
          });
        files.push(this.toPlanned(file, scopeRoot, scope, content));
      }
    }

    return files;
  }

  private toPlanned(
    file: { absPath: string; kind: FileKind; workflowId: string | undefined },
    scopeRoot: string,
    scope: Scope,
    content: string,
  ): PlannedFile {
    const relPath = path.relative(scopeRoot, file.absPath).split(path.sep).join("/");
    return {
      hostId: this.id,
      hostLabel: this.label,
      workflowId: file.workflowId,
      kind: file.kind,
      absPath: file.absPath,
      relPath,
      displayPath: scope === "global" ? `~/${relPath}` : relPath,
      content,
    };
  }
}

/**
 * Paths are reported relative to the root of the scope they were written in:
 * the repository for project scope, the home directory for global scope. That
 * keeps project-scope output identical to what it has always been, and makes
 * global-scope output print as `~/…` rather than as an absolute path that
 * differs per machine.
 */
export function scopeRootFor(ctx: HostContext, scope: Scope): string {
  return scope === "global" ? ctx.home : ctx.projectRoot;
}
