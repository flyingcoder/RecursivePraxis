/**
 * The unit of authored content `lambda init` installs into a host agent.
 *
 * Every kind below is a thing a host can be given: prose it reads (`skill`,
 * `command`, `agent`, `rule`) or configuration it loads (`hook`, `mcp`). The
 * predecessor of this hierarchy was a single `WorkflowDefinition` record whose
 * meaning was decided entirely by the layout that consumed it — one body was
 * written out as both a skill and a command, and there was no way to author
 * anything that was not both. That shape cannot express a hook, an MCP server,
 * or a rule, all of which a marketplace plugin needs to carry.
 *
 * An asset knows what it *is*. Where it lands is still the host's decision
 * (`src/hosts/layouts.ts`), and how it is rendered is still the pipeline's
 * (`src/render/`). Adding a kind is a subclass plus a line in the layouts that
 * can place it; no host is required to place every kind.
 */

export const ASSET_KINDS = ["skill", "command", "agent", "rule", "hook", "mcp"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

/**
 * Slugs become directory names, file names, and — for invocable assets — the
 * text a human types at a host prompt. `remark-praxis-invocation` matches
 * `{{invoke:[a-z0-9-]+}}`, so a slug outside this shape would render as a
 * literal placeholder in shipped prose rather than failing here.
 */
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export interface AssetInit {
  /** Lowercase, hyphenated. Used verbatim in paths and invocations. */
  readonly slug: string;
  /** Human-facing name, for docs and listings. Not written to any host file. */
  readonly title: string;
  /** The `description:` frontmatter value, and how a host decides to load this. */
  readonly description: string;
}

export abstract class Asset {
  abstract readonly kind: AssetKind;

  readonly slug: string;
  readonly title: string;
  readonly description: string;

  constructor(init: AssetInit) {
    if (!SLUG_PATTERN.test(init.slug)) {
      throw new Error(
        `asset slug "${init.slug}" must be lowercase alphanumeric with interior hyphens — it is used verbatim in file paths and invocations`,
      );
    }
    if (init.description.trim().length === 0) {
      throw new Error(`asset "${init.slug}" has an empty description — hosts use it to decide when to load an asset`);
    }
    this.slug = init.slug;
    this.title = init.title;
    this.description = init.description.trim();
  }

  /**
   * Whether a human can type this asset's name at a host prompt, which is what
   * makes it a legal target for `{{invoke:<slug>}}`. Prose the model loads on
   * its own (a rule) and configuration (a hook) are not invocable.
   */
  get invocable(): boolean {
    return false;
  }

  /** Stable identity across kinds — two kinds may share a slug, as skill/command do. */
  get ref(): string {
    return `${this.kind}:${this.slug}`;
  }
}
