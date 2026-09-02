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
  readonly verifiedAgainst = "Cursor skills + commands, 2026-08";

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
    });
  }

  override invocation(slug: string, _scope: Scope): string {
    return `/praxis-${slug}`;
  }

  override pipeline(scope: Scope): DocumentPipeline {
    return DocumentPipeline.for(this, scope, { frontmatter: ["name", "description"] });
  }
}
