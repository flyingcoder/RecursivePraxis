import path from "node:path";
import { HostAdapter } from "./HostAdapter.js";
import { HostLayout, praxisPrefixed, StandaloneLayout } from "./layouts.js";
import type { HostId, Scope } from "./types.js";
import type { HostContext } from "../detect/context.js";
import { binarySignal, configSignal, envSignal, isPresent, projectSignal } from "../detect/signals.js";
import { DocumentPipeline } from "../render/DocumentPipeline.js";

export class CursorAdapter extends HostAdapter {
  readonly id: HostId = "cursor";
  readonly label = "Cursor";
  readonly verifiedAgainst = "Cursor skills + commands 2026-08; Cursor hooks (hooks.json v1) 2026-09";

  protected override probes(ctx: HostContext) {
    return [
      envSignal(ctx, "CURSOR_TRACE_ID"),
      envSignal(ctx, "CURSOR_AGENT"),
      binarySignal(ctx, "cursor"),
      binarySignal(ctx, "cursor-agent"),
      configSignal(ctx, path.join(ctx.home, ".cursor"), "~/.cursor/"),
      configSignal(
        ctx,
        path.join(ctx.home, "Library", "Application Support", "Cursor"),
        "~/Library/Application Support/Cursor/",
      ),
      configSignal(ctx, path.join(ctx.home, ".config", "Cursor"), "~/.config/Cursor/"),
      projectSignal(ctx, path.join(ctx.projectRoot, ".cursor"), "./.cursor/"),
    ].filter(isPresent);
  }

  /**
   * Same shape at both scopes. `rule` and `mcp` are absent deliberately: Cursor
   * has both surfaces, but their paths have drifted across releases and
   * `verifiedAgainst` above does not yet cover them. Add them here once
   * checked, rather than writing into a directory Cursor may ignore.
   */
  override layout(ctx: HostContext, scope: Scope): HostLayout {
    const root = scope === "global" ? ctx.home : ctx.projectRoot;
    return new StandaloneLayout(root, ".cursor", {
      skill: { at: (slug) => path.join("skills", praxisPrefixed(slug), "SKILL.md"), nameAs: praxisPrefixed },
      command: { at: (slug) => path.join("commands", `praxis-${slug}.md`) },
      // Cursor reads `.cursor/mcp.json`, which sits inside this layout's root,
      // so the shared `mcpServers` renderer fits without a per-host shape.
      mcp: "mcp.json",
      // Hooks, unlike MCP, do need a per-host shape. Cursor agrees with nobody
      // here: the event is `beforeShellExecution`, an entry is flat rather than
      // a matcher group wrapping a handler list, `matcher` is a regex over the
      // *command text* rather than a tool name, and the file carries a schema
      // `version`. Only the exit-code contract is shared — 2 blocks, as it does
      // for Claude Code and Codex — which is what lets one `lambda gate` serve
      // all three.
      hooksFragment: {
        absPath: path.join(root, ".cursor", "hooks.json"),
        pointer: ["hooks"],
        // `UserPromptSubmit` (the context-injection hook) maps to `undefined`
        // deliberately, not by omission: Cursor's `beforeSubmitPrompt` schema
        // supports only `continue`/`user_message` (shown when blocking), with
        // no additive-context field as of this file's `verifiedAgainst` date.
        // A host with no place for a hook kind simply gets none, same as
        // opencode gets no hooks at all — see `layouts.ts`'s `eventAs`
        // handling below, which drops the hook entirely rather than mapping
        // it to a Cursor event it cannot actually serve.
        eventAs: (event) => (event === "PreToolUse" ? "beforeShellExecution" : undefined),
        render: (hook) => ({
          type: "command",
          command: hook.command,
          // `hook.matcher` is a tool name (`Bash`), which is meaningless to a
          // matcher Cursor tests against the command line. The gate is a no-op
          // for anything that is not a `lambda step` call, so the honest
          // translation is the binary it guards.
          matcher: "lambda",
        }),
        alsoSet: [{ pointer: ["version"], value: 1 }],
      },
    });
  }

  override invocation(slug: string, _scope: Scope): string {
    return `/praxis-${slug}`;
  }

  override pipeline(scope: Scope): DocumentPipeline {
    return DocumentPipeline.for(this, scope, { frontmatter: ["name", "description"] });
  }
}
