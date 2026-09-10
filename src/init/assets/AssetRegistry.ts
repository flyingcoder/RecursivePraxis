import { Asset, ASSET_KINDS, type AssetKind } from "./Asset.js";
import { Agent, Command, ProseAsset, Rule, Skill } from "./ProseAsset.js";
import { Hook, McpServer } from "./DataAsset.js";

/**
 * Everything this build can install, indexed by kind.
 *
 * Host layouts are handed this object rather than a flat list because the
 * JSON-backed kinds aggregate — every `Hook` collapses into one `hooks.json`,
 * every `McpServer` into one `.mcp.json` — so a layout has to be able to ask
 * for all of a kind at once, not just be shown assets one at a time.
 *
 * The order within a kind is authoring order (the order of the arrays in
 * `src/init/<kind>/index.ts`), and it is preserved everywhere: generated file
 * lists, `--json` output, and the install manifest all follow it, so a
 * reordered index file is a visible diff rather than a silent one.
 */
export class AssetRegistry {
  private readonly byKind: ReadonlyMap<AssetKind, readonly Asset[]>;

  constructor(assets: readonly Asset[]) {
    const grouped = new Map<AssetKind, Asset[]>(ASSET_KINDS.map((kind) => [kind, []]));
    const seen = new Set<string>();
    for (const asset of assets) {
      if (seen.has(asset.ref)) {
        throw new Error(`two assets share the id "${asset.ref}" — slugs must be unique within a kind`);
      }
      seen.add(asset.ref);
      grouped.get(asset.kind)!.push(asset);
    }
    this.byKind = grouped;
  }

  /** Every asset, grouped by kind in `ASSET_KINDS` order. */
  all(): readonly Asset[] {
    return ASSET_KINDS.flatMap((kind) => this.byKind.get(kind) ?? []);
  }

  skills(): readonly Skill[] {
    return this.byKind.get("skill") as readonly Skill[];
  }

  commands(): readonly Command[] {
    return this.byKind.get("command") as readonly Command[];
  }

  agents(): readonly Agent[] {
    return this.byKind.get("agent") as readonly Agent[];
  }

  rules(): readonly Rule[] {
    return this.byKind.get("rule") as readonly Rule[];
  }

  hooks(): readonly Hook[] {
    return this.byKind.get("hook") as readonly Hook[];
  }

  mcpServers(): readonly McpServer[] {
    return this.byKind.get("mcp") as readonly McpServer[];
  }

  /** Every Markdown-backed asset, in kind order. */
  allProse(): readonly ProseAsset[] {
    return [...this.skills(), ...this.commands(), ...this.agents(), ...this.rules()];
  }

  /** Prose assets of one kind, for layouts that place a kind uniformly. */
  prose(kind: AssetKind): readonly ProseAsset[] {
    return (this.byKind.get(kind) ?? []) as readonly ProseAsset[];
  }

  find(kind: AssetKind, slug: string): Asset | undefined {
    return (this.byKind.get(kind) ?? []).find((asset) => asset.slug === slug);
  }

  /**
   * Slugs a `{{invoke:<slug>}}` reference may name, de-duplicated across kinds.
   *
   * A skill and a command commonly share a slug — they are the same subject on
   * two surfaces — and a cross-reference means "however this host lets you
   * reach it", which is exactly what `HostAdapter.invocation` resolves.
   */
  invocableSlugs(): readonly string[] {
    const slugs: string[] = [];
    for (const asset of this.all()) {
      if (asset.invocable && !slugs.includes(asset.slug)) slugs.push(asset.slug);
    }
    return slugs;
  }
}
