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

/** File roles a layout can emit. Only `skill` and `command` carry workflow prose. */
export type FileKind = "skill" | "command" | "manifest";

/** What the renderer needs to know about the single file it is producing. */
export interface RenderTarget {
  readonly kind: "skill" | "command";
  /** Value for the frontmatter `name:` field. Skills only; commands have none. */
  readonly name: string | undefined;
}

/** The part of a host the renderer uses: how this host spells an invocation. */
export interface InvocationResolver {
  invocation(workflowId: string, scope: Scope): string;
}
