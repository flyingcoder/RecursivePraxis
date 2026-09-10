import { Asset, type AssetInit, type AssetKind } from "./Asset.js";

/**
 * Assets whose on-disk form is JSON rather than Markdown.
 *
 * These differ from prose in a way the writer cares about: a JSON config file
 * has nowhere to put an HTML comment, so the managed-marker merge that
 * protects hand-edits in a Markdown body cannot protect these. They are
 * whole-file generated and compared by content instead
 * (`isManagedMarkdown` in `src/hosts/types.ts`).
 *
 * They also aggregate. Many hooks become one `hooks/hooks.json`; many servers
 * become one `.mcp.json`. That is why a layout is handed the whole registry
 * and asked for its files, rather than being asked once per asset.
 */
export abstract class DataAsset extends Asset {}

/** The events a hook can bind to. Names follow Claude Code's hook vocabulary. */
export const HOOK_EVENTS = [
  "PreToolUse",
  "PostToolUse",
  "UserPromptSubmit",
  "SessionStart",
  "SessionEnd",
  "Stop",
  "SubagentStop",
  "PreCompact",
  "Notification",
] as const;
export type HookEvent = (typeof HOOK_EVENTS)[number];

export interface HookInit extends AssetInit {
  readonly event: HookEvent;
  /**
   * Tool-name pattern this hook fires for, for the events that match on one.
   * Omit to fire on every occurrence of the event.
   */
  readonly matcher?: string;
  /** Shell command to run. Receives the hook payload on stdin. */
  readonly command: string;
  /** Seconds before the host abandons the hook. Omit for the host default. */
  readonly timeout?: number;
}

/**
 * One shell command bound to one host event.
 *
 * This is the surface that turns a RecursivePraxis gate from advice into
 * enforcement: a `PreToolUse` hook that shells out to `lambda` can refuse an
 * illegal operator, where a skill can only describe the constraint and hope.
 */
export class Hook extends DataAsset {
  readonly kind: AssetKind = "hook";

  readonly event: HookEvent;
  readonly matcher: string | undefined;
  readonly command: string;
  readonly timeout: number | undefined;

  constructor(init: HookInit) {
    super(init);
    this.event = init.event;
    this.matcher = init.matcher;
    this.command = init.command;
    this.timeout = init.timeout;
  }

  /** One entry of the `hooks: [...]` array under this hook's event. */
  toMatcherEntry(): Record<string, unknown> {
    const handler: Record<string, unknown> = { type: "command", command: this.command };
    if (this.timeout !== undefined) handler.timeout = this.timeout;
    const entry: Record<string, unknown> = {};
    if (this.matcher !== undefined) entry.matcher = this.matcher;
    entry.hooks = [handler];
    return entry;
  }
}

export interface McpServerInit extends AssetInit {
  /** Executable to spawn for a stdio server. */
  readonly command: string;
  readonly args?: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
}

/**
 * A stdio MCP server entry.
 *
 * `slug` is the server name every host will show, so it is also the key under
 * `mcpServers`. Only stdio is modelled: an HTTP server would need a URL and a
 * transport discriminator, and inventing that shape before something needs it
 * would be guessing at a schema four vendors have to agree with.
 */
export class McpServer extends DataAsset {
  readonly kind: AssetKind = "mcp";

  readonly command: string;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;

  constructor(init: McpServerInit) {
    super(init);
    this.command = init.command;
    this.args = init.args ?? [];
    this.env = init.env ?? {};
  }

  /** The value half of one `mcpServers` entry. */
  toServerEntry(): Record<string, unknown> {
    const entry: Record<string, unknown> = { command: this.command };
    if (this.args.length > 0) entry.args = [...this.args];
    if (Object.keys(this.env).length > 0) entry.env = { ...this.env };
    return entry;
  }
}

/**
 * The `hooks.json` a host loads, grouped by event.
 *
 * Grouping happens here rather than in a layout because the shape is a
 * property of the hook vocabulary, not of where any one host keeps the file.
 */
export function renderHooksJson(hooks: readonly Hook[]): string {
  const byEvent: Record<string, Record<string, unknown>[]> = {};
  for (const hook of hooks) {
    (byEvent[hook.event] ??= []).push(hook.toMatcherEntry());
  }
  return `${JSON.stringify({ hooks: byEvent }, null, 2)}\n`;
}

/** The `mcpServers` config a host loads, keyed by server slug. */
export function renderMcpJson(servers: readonly McpServer[]): string {
  const mcpServers: Record<string, unknown> = {};
  for (const server of servers) {
    mcpServers[server.slug] = server.toServerEntry();
  }
  return `${JSON.stringify({ mcpServers }, null, 2)}\n`;
}
