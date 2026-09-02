/**
 * Vocabulary shared by the host adapters and the renderer. Kept free of
 * imports so `src/render/` can depend on it without a cycle back into
 * `src/hosts/`.
 */

export const HOST_IDS = ["claude", "cursor", "codex", "opencode"] as const;
export type HostId = (typeof HOST_IDS)[number];

export function isHostId(value: string): value is HostId {
  return (HOST_IDS as readonly string[]).includes(value);
}

export const SCOPES = ["project", "global"] as const;
export type Scope = (typeof SCOPES)[number];

export function isScope(value: string): value is Scope {
  return (SCOPES as readonly string[]).includes(value);
}

/**
 * File roles a layout can emit. The first four are Markdown carrying an asset
 * body; the last three are whole-file JSON.
 *
 * `manifest` has no asset behind it — it is the package descriptor a plugin
 * layout writes for itself.
 */
export type FileKind = "skill" | "command" | "agent" | "rule" | "hook" | "mcp" | "manifest";

/** Prose kinds, which is exactly the set the render pipeline can produce. */
export type ProseFileKind = Extract<FileKind, "skill" | "command" | "agent" | "rule">;

const MANAGED_MARKDOWN: ReadonlySet<FileKind> = new Set<FileKind>(["skill", "command", "agent", "rule"]);

/**
 * Whether a file of this kind carries the RecursivePraxis managed markers.
 *
 * This is the one distinction the writer and the inspector actually need. A
 * Markdown body can hold an HTML comment, so a hand-edit after `MARKER_END`
 * survives a re-run; a JSON config cannot, so it is whole-file generated and
 * compared by content instead. Branching on this rather than on a growing list
 * of kind names is what keeps `write.ts` and `inspect.ts` correct as kinds are
 * added.
 */
export function isManagedMarkdown(kind: FileKind): boolean {
  return MANAGED_MARKDOWN.has(kind);
}

/** What the renderer needs to know about the single file it is producing. */
export interface RenderTarget {
  readonly kind: ProseFileKind;
  /** Value for the frontmatter `name:` field, when this host's file wants one. */
  readonly name: string | undefined;
}

/** The part of a host the renderer uses: how this host spells an invocation. */
export interface InvocationResolver {
  invocation(slug: string, scope: Scope): string;
}
