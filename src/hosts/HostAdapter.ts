import path from "node:path";
import type { HostContext } from "../detect/context.js";
import {
  autoSelects,
  rankConfidence,
  type Confidence,
  type HostSignal,
} from "../detect/signals.js";
import type { DocumentPipeline } from "../render/DocumentPipeline.js";
import type { AssetRegistry } from "../init/assets/AssetRegistry.js";
import type { ProseAsset } from "../init/assets/ProseAsset.js";
import type { HostLayout, JsonFragment } from "./layouts.js";
import type { FileKind, HostId, InvocationResolver, ProseFileKind, Scope } from "./types.js";

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
  /** Slug of the asset this file carries, or undefined for package-level files. */
  readonly assetSlug: string | undefined;
  /** Whether a human can type this asset's name at this host's prompt. */
  readonly invocable: boolean;
  readonly kind: FileKind;
  readonly absPath: string;
  /** Relative to the scope root — the project root, or the home directory. */
  readonly relPath: string;
  /** How the path is shown to a human: `~/…` at global scope, as-is at project scope. */
  readonly displayPath: string;
  /**
   * The whole file's content — except for a fragment, where it is our entry
   * alone. That is deliberate: the manifest hashes this field, and hashing the
   * whole of a file the user co-owns would report every unrelated edit they
   * make as our drift.
   */
  readonly content: string;
  /** Set when this file is shared and only one key of it is ours. */
  readonly fragment?: JsonFragment | undefined;
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
 * `uninstall` need no edits at all.
 *
 * Note what an adapter does *not* decide: which assets exist. Content is
 * enumerated only in `src/init/<kind>/index.ts`, so adding a skill, a rule, or
 * an MCP server touches no host — and a host that has no place for a kind
 * simply omits it from its layout's placement table.
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

  /** Step 4: where this host's package lives at this scope, and what it holds. */
  abstract layout(ctx: HostContext, scope: Scope): HostLayout;

  /** Step 4: how an asset body becomes this host's file. */
  abstract pipeline(scope: Scope): DocumentPipeline;

  /** What the human types once it is installed. */
  abstract invocation(slug: string, scope: Scope): string;

  /**
   * Ranks this host's evidence. Not overridden by any adapter, deliberately:
   * a host supplies signals and the ladder in `src/detect/signals.ts` ranks
   * them, so every row of the Step 1 table means the same thing.
   */
  detect(ctx: HostContext, assets: AssetRegistry): HostDetection {
    const signals = this.probes(ctx);
    return {
      hostId: this.id,
      label: this.label,
      signals,
      confidence: rankConfidence(signals),
      defaultSelected: autoSelects(signals),
      alreadyInitialized: this.layout(ctx, "project").ownsAnyExistingFile(ctx, assets),
    };
  }

  /** Every file this host would write at this scope, content included. */
  plan(
    assets: AssetRegistry,
    ctx: HostContext,
    scope: Scope,
    options: PlanOptions,
  ): readonly PlannedFile[] {
    const layout = this.layout(ctx, scope);
    const render = this.pipeline(scope);
    const scopeRoot = scopeRootFor(ctx, scope);

    return layout.files(assets, { version: options.version }).map((file) => {
      // A fragment has no whole-file rendering. Its `content` is the entry
      // itself, which is what the manifest hashes.
      const content =
        file.fragment !== undefined
          ? `${JSON.stringify(file.fragment.value, null, 2)}\n`
          : (file.content ??
            render.render(file.asset as ProseAsset, {
              kind: file.kind as ProseFileKind,
              name: file.frontmatterName,
            }));

      const relPath = path.relative(scopeRoot, file.absPath).split(path.sep).join("/");
      return {
        hostId: this.id,
        hostLabel: this.label,
        assetSlug: file.asset?.slug,
        invocable: file.asset?.invocable ?? false,
        kind: file.kind,
        absPath: file.absPath,
        relPath,
        displayPath: scope === "global" ? `~/${relPath}` : relPath,
        content,
        fragment: file.fragment,
      };
    });
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
