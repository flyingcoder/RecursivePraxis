import path from "node:path";
import { HostAdapter } from "./HostAdapter.js";
import { HostLayout, StandaloneLayout } from "./layouts.js";
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

  override layout(ctx: HostContext, scope: Scope): HostLayout {
    const root = scope === "global" ? ctx.home : ctx.projectRoot;
    return new StandaloneLayout(root, ".cursor", (id) => path.join("commands", `praxis-${id}.md`));
  }

  override invocation(workflowId: string, _scope: Scope): string {
    return `/praxis-${workflowId}`;
  }

  override pipeline(scope: Scope): DocumentPipeline {
    return DocumentPipeline.for(this, scope, { frontmatter: ["name", "description"] });
  }
}
