import path from "node:path";
import type { HostContext } from "../detect/context.js";
import type { FileKind } from "./types.js";
import type { Asset } from "../init/assets/Asset.js";
import type { AssetRegistry } from "../init/assets/AssetRegistry.js";
import {
  renderHooksJson,
  renderMcpJson,
  type Hook,
  type HookEvent,
  type McpServer,
} from "../init/assets/DataAsset.js";

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

/**
 * One entry spliced into a JSON document somebody else owns.
 *
 * The distinction this carries is ownership, not format. A whole-file JSON
 * asset (`Placement.mcp`) lands somewhere only RecursivePraxis writes, so
 * generating it wholesale is safe. A fragment lands inside a file that holds
 * the user's own configuration — every MCP server they have, alongside
 * unrelated settings — so only the value at `pointer` may be touched, and
 * everything around it has to survive untouched.
 */
interface FragmentTarget {
  /** Key path to write, from the document root. */
  readonly pointer: readonly string[];
  readonly value: unknown;
}

/** The value at `pointer` is ours alone, so we set it outright. */
export interface KeyedFragment extends FragmentTarget {
  readonly merge: "set";
}

/**
 * `pointer` names an array the user shares with us, and our entry is one
 * element of it.
 *
 * Claude Code's `hooks.<Event>` is the case that needs this: it is a list of
 * matcher groups with no key to address ours by, so "set the value at pointer"
 * would delete every hook the user wrote. Appending is the only safe write, and
 * deep equality of the element is the only identity available — a hand-edited
 * copy of our entry is therefore a different entry, which `init` re-adds beside
 * and `uninstall` leaves alone rather than guessing it was once ours.
 */
export interface ArrayEntryFragment extends FragmentTarget {
  readonly merge: "append";
}

/**
 * A key the host's schema requires, which we create but do not own.
 *
 * Cursor's top-level `"version": 1` is the case: a `hooks.json` we author from
 * nothing needs it, but a file the user already had has it already, and it is
 * not ours to change or to take away. So it is written only when absent, left
 * alone when present — even at a different value, since a schema version the
 * host raised is the host's business — and never removed on uninstall. Deleting
 * it would break the hooks of theirs we deliberately left behind.
 */
export interface SchemaKeyFragment extends FragmentTarget {
  readonly merge: "ensure";
}

export type JsonFragment = KeyedFragment | ArrayEntryFragment | SchemaKeyFragment;

export interface LayoutFile {
  readonly absPath: string;
  readonly kind: FileKind;
  /** The asset this file carries, or undefined for package-level files. */
  readonly asset: Asset | undefined;
  /** Frontmatter `name:` for prose whose host requires one; undefined otherwise. */
  readonly frontmatterName: string | undefined;
  /** Fixed content, for files the layout authors itself rather than rendering. */
  readonly content: string | undefined;
  /**
   * Set when this file is a shared one we may only splice into. Mutually
   * exclusive with `content`: a fragment has no whole-file rendering.
   */
  readonly fragment?: JsonFragment | undefined;
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
  /**
   * Single aggregate file for every MCP server, relative to the layout root.
   *
   * Only for a file RecursivePraxis owns outright — in practice just the
   * `.mcp.json` inside our own plugin directory. Every other host keeps its MCP
   * servers in a file the user shares with their own; those use `mcpFragment`.
   */
  readonly mcp?: string;
  /**
   * One entry spliced into a config file the user owns.
   *
   * `absPath` is absolute rather than root-relative because these files sit
   * outside the layout's directory: `<proj>/.mcp.json` is not inside
   * `.claude/`, and `opencode.json` is not inside `.opencode/commands/`.
   *
   * `render` exists because the schemas genuinely differ. Claude and Cursor
   * key servers under `mcpServers` as `{command, args}`; opencode keys them
   * under `mcp` as `{type, command: [cmd, ...args]}`, with the arguments folded
   * into the command array. One pointer plus one renderer covers both without a
   * per-host writer.
   */
  readonly mcpFragment?: {
    readonly absPath: string;
    /** Container path; the server's slug is appended to it. */
    readonly pointer: readonly string[];
    readonly render: (server: McpServer) => unknown;
  };
  /**
   * Our hooks spliced into a config file the user owns, one entry per hook.
   *
   * The counterpart of `hooks` for a shared file, and it needs its own field
   * rather than reusing `mcpFragment`'s shape because the write is a different
   * one: an MCP server is a map entry keyed by slug, while a hook is an element
   * appended to the array at `<pointer>.<Event>`.
   *
   * `eventAs` and `render` default to the Claude Code vocabulary and shape that
   * `HOOK_EVENTS` and `Hook.toMatcherEntry` already speak, so a host that agrees
   * with it — Codex CLI does, name for name — supplies neither. Cursor supplies
   * both: it calls the event `beforeShellExecution`, and its entry is flat
   * (`{type, command, matcher}`) rather than a matcher group wrapping a handler
   * list. That is the same reason `mcpFragment` carries a `render`, and the same
   * boundary: a vocabulary is modelled once, per host, beside the
   * `verifiedAgainst` string of the person who checked it.
   */
  readonly hooksFragment?: {
    readonly absPath: string;
    /** Container path; this host's name for the event is appended to it. */
    readonly pointer: readonly string[];
    /**
     * This host's name for one of our events, or undefined when it has no
     * equivalent — a hook for that event is then simply not placed here, the
     * same way an absent prose kind is not written.
     */
    readonly eventAs?: (event: HookEvent) => string | undefined;
    /** This host's shape for one element of the event's array. */
    readonly render?: (hook: Hook) => unknown;
    /**
     * Fixed keys this host's schema requires alongside our entry — Cursor's
     * top-level `"version": 1` is the only one so far. Written only when a hook
     * was actually placed, so we never author a file we put nothing in, and
     * written as `ensure`: created if absent, never overwritten, never removed.
     */
    readonly alsoSet?: readonly { readonly pointer: readonly string[]; readonly value: unknown }[];
  };
}

const PROSE_KINDS = ["skill", "command", "agent", "rule"] as const;

export function praxisPrefixed(slug: string): string {
  return `recursive-praxis-${slug}`;
}

export abstract class HostLayout {
  /** Absolute path of the directory this layout owns. */
  abstract readonly root: string;

  /**
   * Every directory this layout owns.
   *
   * Almost always just `[root]`. It differs only for a `CompositeLayout`, whose
   * whole purpose is spanning more than one. Consumers that mean "the
   * boundaries of what we may touch" — `uninstall`'s directory pruning — must
   * read this rather than `root`, or they will stop at the first root and treat
   * the others as somebody else's.
   */
  get roots(): readonly string[] {
    return [this.root];
  }

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

    const hooksFragment = this.placement.hooksFragment;
    if (hooksFragment !== undefined) {
      const spliced: LayoutFile[] = [];
      for (const hook of hooks) {
        // Not `?? hook.event`: `eventAs` returning undefined is the host saying
        // it has no such event, which is a different fact from having no mapping.
        const event =
          hooksFragment.eventAs === undefined ? hook.event : hooksFragment.eventAs(hook.event);
        if (event === undefined) continue;
        spliced.push({
          absPath: hooksFragment.absPath,
          kind: "hook",
          asset: undefined,
          frontmatterName: undefined,
          content: undefined,
          fragment: {
            merge: "append",
            pointer: [...hooksFragment.pointer, event],
            value: hooksFragment.render?.(hook) ?? hook.toMatcherEntry(),
          },
        });
      }

      // The schema keys come first so that a file we are creating is valid at
      // every intermediate state, and they are skipped entirely when no hook
      // was placed — a `version` alone is a file we gave the user nothing for.
      if (spliced.length > 0) {
        for (const { pointer, value } of hooksFragment.alsoSet ?? []) {
          out.push({
            absPath: hooksFragment.absPath,
            kind: "hook",
            asset: undefined,
            frontmatterName: undefined,
            content: undefined,
            fragment: { merge: "ensure", pointer, value },
          });
        }
        out.push(...spliced);
      }
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

    const fragment = this.placement.mcpFragment;
    if (fragment !== undefined && servers.length > 0) {
      for (const server of servers) {
        out.push({
          absPath: fragment.absPath,
          kind: "mcp",
          asset: undefined,
          frontmatterName: undefined,
          content: undefined,
          fragment: {
            merge: "set",
            pointer: [...fragment.pointer, server.slug],
            value: fragment.render(server),
          },
        });
      }
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
 * Its MCP configuration lives in `opencode.json`, which sits outside this root,
 * so it is not placed here. `CompositeLayout` is the layout whose root spans
 * both; this one stays a flat directory of commands.
 */
export class CommandsOnlyLayout extends HostLayout {
  protected readonly placement: Placement;

  constructor(readonly root: string) {
    super();
    this.placement = { command: { at: (slug) => `praxis-${slug}.md` } };
  }
}

/**
 * Several layouts presented as one, for a host whose files do not all live
 * under a single directory.
 *
 * Three placements need this. `~/.claude/rules/` is not inside the plugin
 * directory and a plugin has no rules component to carry it; `<proj>/.mcp.json`
 * is not inside `.claude/`; `opencode.json` is not inside `.opencode/commands/`.
 *
 * Composing whole layouts rather than adding a second path table to each one
 * keeps every existing layout as simple as it is: each still describes one
 * directory, and spanning is a property of the composition. `root` reports the
 * first child's, which is the host's principal directory and the one
 * `layoutMissing` is a meaningful question about; `roots` reports them all, so
 * `uninstall` treats every directory as in-bounds for pruning.
 */
export class CompositeLayout extends HostLayout {
  protected readonly placement: Placement = {};

  private readonly layouts: readonly HostLayout[];

  constructor(layouts: readonly HostLayout[]) {
    super();
    if (layouts.length === 0) {
      throw new Error("a CompositeLayout needs at least one layout to compose");
    }
    this.layouts = layouts;
  }

  get root(): string {
    return this.layouts[0]!.root;
  }

  override get roots(): readonly string[] {
    // De-duplicated: two children may legitimately share a root, and a repeated
    // boundary would make `pruneEmptyDirs` walk the same directory twice.
    return [...new Set(this.layouts.map((layout) => layout.root))];
  }

  override files(assets: AssetRegistry, options: LayoutOptions): readonly LayoutFile[] {
    return this.layouts.flatMap((layout) => layout.files(assets, options));
  }

  override ownsAnyExistingFile(ctx: HostContext, assets: AssetRegistry): boolean {
    return this.layouts.some((layout) => layout.ownsAnyExistingFile(ctx, assets));
  }
}
