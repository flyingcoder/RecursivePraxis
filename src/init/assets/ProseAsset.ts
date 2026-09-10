import { Asset, type AssetInit, type AssetKind } from "./Asset.js";

/**
 * Assets whose on-disk form is Markdown: YAML frontmatter, then a body wrapped
 * in the RecursivePraxis managed markers.
 *
 * The body is host-neutral by contract. Anything that differs per host belongs
 * in `src/hosts/` or in a render plugin — never in a second copy of a body.
 * Write `{{invoke:<slug>}}` to reference another invocable asset; the render
 * pipeline rewrites it into whichever syntax the target host and scope use
 * (`/praxis:status`, `/praxis-status`, `$recursive-praxis-status`,
 * `/recursive-praxis:status`).
 */

export interface ProseAssetInit extends AssetInit {
  /** Markdown. Leading and trailing blank lines are trimmed. */
  readonly body: string;
  /**
   * Blocks appended after the body, separated by a blank line. Kept separate
   * from `body` so shared boilerplate stays one string that every asset opts
   * into by name rather than by being copied into it.
   */
  readonly footers?: readonly string[];
}

export abstract class ProseAsset extends Asset {
  /** The complete Markdown body: authored prose plus any footers. */
  readonly body: string;

  constructor(init: ProseAssetInit) {
    super(init);
    const parts = [init.body.trim(), ...(init.footers ?? []).map((footer) => footer.trim())];
    this.body = parts.filter((part) => part.length > 0).join("\n\n");
  }
}

/**
 * Model-invoked prose. The host loads it when `description` matches what the
 * model is doing, so the description is load-bearing rather than decorative.
 *
 * A skill's frontmatter `name` must match the directory the host loads it
 * from, which differs between a standalone install and a plugin — so the
 * layout supplies it at render time, not the asset.
 */
export class Skill extends ProseAsset {
  readonly kind: AssetKind = "skill";

  override get invocable(): boolean {
    return true;
  }
}

/**
 * Human-invoked prose: the thing typed as `/praxis-status` or `$…`.
 *
 * Commands carry `description` frontmatter and no `name` — the file name is
 * the command name on every host that has commands.
 */
export class Command extends ProseAsset {
  readonly kind: AssetKind = "command";

  override get invocable(): boolean {
    return true;
  }

  /**
   * A command that ships the same prose as an existing asset.
   *
   * The seven kernel commands are currently word-for-word their matching
   * skills, and duplicating seven bodies to say so would guarantee they drift.
   * This states the relationship instead: to make a command diverge, replace
   * the `Command.mirroring(...)` call in its file with a `new Command({...})`
   * carrying its own body. Nothing else has to change.
   */
  static mirroring(source: ProseAsset, overrides: Partial<ProseAssetInit> = {}): Command {
    return new Command({
      slug: source.slug,
      title: source.title,
      description: source.description,
      body: source.body,
      ...overrides,
    });
  }
}

/**
 * A delegated sub-agent definition: prose plus frontmatter describing when the
 * host should hand work to it. Claude Code loads these from `agents/`; hosts
 * without a sub-agent concept place nothing and the asset is simply skipped.
 */
export class Agent extends ProseAsset {
  readonly kind: AssetKind = "agent";
}

/**
 * Always-on context a host loads without being asked — Cursor rules and their
 * equivalents. Not invocable: nothing types a rule's name, so `{{invoke:}}`
 * may not target one.
 */
export class Rule extends ProseAsset {
  readonly kind: AssetKind = "rule";
}
