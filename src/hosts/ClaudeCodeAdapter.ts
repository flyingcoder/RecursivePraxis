import path from "node:path";
import { HostAdapter } from "./HostAdapter.js";
import { HostLayout, PluginLayout, StandaloneLayout } from "./layouts.js";
import type { HostId, Scope } from "./types.js";
import type { HostContext } from "../detect/context.js";
import { binarySignal, configSignal, envSignal, isPresent, projectSignal } from "../detect/signals.js";
import { DocumentPipeline } from "../render/DocumentPipeline.js";

export class ClaudeCodeAdapter extends HostAdapter {
  readonly id: HostId = "claude";
  readonly label = "Claude Code";
  readonly verifiedAgainst = "Claude Code skills-directory plugins, 2026-08";

  protected override probes(ctx: HostContext) {
    return [
      envSignal(ctx, "CLAUDECODE"),
      envSignal(ctx, "CLAUDE_CODE_ENTRYPOINT"),
      binarySignal(ctx, "claude"),
      configSignal(ctx, path.join(ctx.home, ".claude"), "~/.claude/"),
      configSignal(ctx, path.join(ctx.home, ".claude.json"), "~/.claude.json"),
      projectSignal(ctx, path.join(ctx.projectRoot, ".claude"), "./.claude/"),
    ].filter(isPresent);
  }

  override layout(ctx: HostContext, scope: Scope): HostLayout {
    return scope === "global"
      ? new PluginLayout(
          path.join(ctx.home, ".claude", "skills", "recursive-praxis"),
          "recursive-praxis",
          "Deterministic RecursivePraxis kernel workflows driven through the `lambda` CLI.",
        )
      : new StandaloneLayout(ctx.projectRoot, ".claude", (id) => path.join("commands", "praxis", `${id}.md`));
  }

  override invocation(workflowId: string, scope: Scope): string {
    // Global scope is a plugin, and Claude Code namespaces a plugin's skills
    // by plugin name. Project scope keeps the standalone `/praxis:` prefix.
    return scope === "global" ? `/recursive-praxis:${workflowId}` : `/praxis:${workflowId}`;
  }

  override pipeline(scope: Scope): DocumentPipeline {
    return DocumentPipeline.for(this, scope, { frontmatter: ["name", "description"] });
  }
}
