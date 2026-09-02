import path from "node:path";
import type { HostContext } from "../detect/context.js";
import type { FileKind } from "./types.js";
import type { Asset } from "../init/assets/Asset.js";
import type { AssetRegistry } from "../init/assets/AssetRegistry.js";
import { renderHooksJson, renderMcpJson } from "../init/assets/DataAsset.js";

/**
 * Where a host's package lives on disk, and which asset kinds it can hold.
 *
 * These are separate classes rather than one configurable shape because "a
 * plugin directory with a manifest", "loose files under a dot-directory", and
 * "a flat directory of command files" are genuinely different structures —
 * different file sets, different naming rules, and only one of them has a
 * manifest at all.
 *
 * What *is* configurable is placement: which kinds this host takes, and the
 * path each lands at. That is a table rather than a hierarchy because it is
 * exactly what drifts between vendor releases, and it belongs beside the
 * adapter's `verifiedAgainst` string — the person who checked the vendor's
 * documentation is the person who fills it in. A kind absent from the table is
 * a kind this host does not receive, which is how a new kind can exist before
 * every host supports it.
 */

export interface LayoutFile {
  readonly absPath: string;
  readonly kind: FileKind;
  /** The asset this file carries, or undefined for package-level files. */
  readonly asset: Asset | undefined;
  /** Frontmatter `name:` for prose whose host requires one; undefined otherwise. */
  readonly frontmatterName: string | undefined;
  /** Fixed content, for files the layout authors itself rather than rendering. */
  readonly content: string | undefined;
}

export interface LayoutOptions {
  /** CLI version, recorded so `doctor` and `sync` have a version to compare. */
  readonly version: string;
}

/**
 * `ownsAnyExistingFile` needs paths, and no path depends on the release
 * version — only the plugin manifest's *content* does. Passing this rather
 * than a real version keeps that probe from having to be handed one.
 */
const VERSION_IRRELEVANT: LayoutOptions = { version: "" };

/** Path within the layout root for a per-asset file. */
export type SlugPath = (slug: string) => string;

export interface ProsePlacement {
  /** Path for this kind's file, relative to the layout root. */
  readonly at: SlugPath;
  /**
   * Frontmatter `name:` this host requires, derived from the slug. Hosts that
   * match `name` against the directory a file was loaded from need this to
   * agree with `at`; hosts with no `name` field omit it.
   */
  readonly nameAs?: (slug: string) => string;
}

/**
 * Which kinds a layout places, and where. Every field is optional: an absent
 * kind is simply not written for this host.
 */
export interface Placement {
  readonly skill?: ProsePlacement;
  readonly command?: ProsePlacement;
  readonly agent?: ProsePlacement;
  readonly rule?: ProsePlacement;
  /** Single aggregate file for every hook, relative to the layout root. */
  readonly hooks?: string;
  /** Single aggregate file for every MCP server, relative to the layout root. */
  readonly mcp?: string;
}

const PROSE_KINDS = ["skill", "command", "agent", "rule"] as const;

export function praxisPrefixed(slug: string): string {
  return `recursive-praxis-${slug}`;
}

export abstract class HostLayout {
  /** Absolute path of the directory this layout owns. */
  abstract readonly root: string;

  protected abstract readonly placement: Placement;

  /** Package-level files with no asset behind them. Empty unless overridden. */
  protected packageFiles(_options: LayoutOptions): readonly LayoutFile[] {
    return [];
  }

  /**
   * Every file this layout would write, in a stable order: package files
   * first, then each prose kind in turn, then the aggregate JSON files.
   *
   * The whole registry is passed rather than one asset at a time because the
   * JSON kinds aggregate — every hook collapses into one `hooks.json` — so a
   * per-asset call could not produce them.
   */
  files(assets: AssetRegistry, options: LayoutOptions): readonly LayoutFile[] {
    const out: LayoutFile[] = [...this.packageFiles(options)];

    for (const kind of PROSE_KINDS) {
      const placement = this.placement[kind];
      if (placement === undefined) continue;
      for (const asset of assets.prose(kind)) {
        out.push({
          absPath: path.join(this.root, placement.at(asset.slug)),
          kind,
          asset,
          frontmatterName: placement.nameAs?.(asset.slug),
          content: undefined,
        });
      }
    }

    const hooks = assets.hooks();
    if (this.placement.hooks !== undefined && hooks.length > 0) {
      out.push({
        absPath: path.join(this.root, this.placement.hooks),
        kind: "hook",
        asset: undefined,
        frontmatterName: undefined,
        content: renderHooksJson(hooks),
      });
    }

    const servers = assets.mcpServers();
    if (this.placement.mcp !== undefined && servers.length > 0) {
      out.push({
        absPath: path.join(this.root, this.placement.mcp),
        kind: "mcp",
        asset: undefined,
        frontmatterName: undefined,
        content: renderMcpJson(servers),
      });
    }

    return out;
  }

  /**
   * Whether any file this layout would write already exists.
   *
   * Detection uses this to classify our own output as `already-initialized`
   * rather than as evidence of the host — otherwise `.agents/skills/`, which
   * is a directory *we* create, would make the tool detect itself. Only
   * asset-backed files count: a package manifest proves the directory exists,
   * not that any content was installed into it.
   */
  ownsAnyExistingFile(ctx: HostContext, assets: AssetRegistry): boolean {
    return this.files(assets, VERSION_IRRELEVANT).some(
      (file) => file.asset !== undefined && ctx.exists(file.absPath),
    );
  }
}

/**
 * Loose files under a host's dot-directory: `<scopeRoot>/<hostDir>/…`. Covers
 * Claude Code at project scope, Cursor at both scopes, and Codex.
 */
export class StandaloneLayout extends HostLayout {
  readonly root: string;

  constructor(
    scopeRoot: string,
    hostDir: string,
    protected readonly placement: Placement,
  ) {
    super();
    this.root = path.join(scopeRoot, hostDir);
  }
}

/**
 * A Claude Code plugin: `.claude-plugin/plugin.json` beside the content it
 * declares.
 *
 * At global scope this is strictly better than loose skill directories. It
 * auto-loads with no marketplace and no install step, namespaces every skill
 * under the plugin name instead of scattering siblings through
 * `~/.claude/skills/`, and its `version` field gives `doctor` and `sync`
 * something to compare against. It is also the exact directory a marketplace
 * entry points at, so the same layout serves both distribution routes.
 */
export class PluginLayout extends HostLayout {
  constructor(
    readonly root: string,
    private readonly pluginName: string,
    private readonly description: string,
    protected readonly placement: Placement,
  ) {
    super();
  }

  protected override packageFiles(options: LayoutOptions): readonly LayoutFile[] {
    const manifest = {
      name: this.pluginName,
      description: this.description,
      version: options.version,
    };
    return [
      {
        absPath: path.join(this.root, ".claude-plugin", "plugin.json"),
        kind: "manifest",
        asset: undefined,
        frontmatterName: undefined,
        content: `${JSON.stringify(manifest, null, 2)}\n`,
      },
    ];
  }
}

/**
 * A flat directory of command files, where the directory itself is the root:
 * `<root>/praxis-<slug>.md`. opencode reads Markdown commands with
 * `description` frontmatter and takes the command name from the file name.
 *
 * Its MCP and plugin configuration live in `opencode.json`, which sits outside
 * this root — so those kinds are not placed here. Adding them needs a layout
 * whose root can span both, not another entry in this table.
 */
export class CommandsOnlyLayout extends HostLayout {
  protected readonly placement: Placement;

  constructor(readonly root: string) {
    super();
    this.placement = { command: { at: (slug) => `praxis-${slug}.md` } };
  }
}
