import path from "node:path";
import { HostAdapter } from "./HostAdapter.js";
import { HostLayout, PluginLayout, praxisPrefixed, StandaloneLayout } from "./layouts.js";
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

  /**
   * Project scope is loose files under `.claude/`; global scope is a plugin
   * directory — the same directory a marketplace entry points at, so the two
   * distribution routes share one layout.
   *
   * Both scopes place the MCP server: the kernel now runs as an MCP server and
   * ships with the plugin by default, so a host that got the skills without it
   * would be taught to call tools it had not been given. `command` and `agent`
   * remain absent from the plugin, and adding either is still one line here.
   */
  override layout(ctx: HostContext, scope: Scope): HostLayout {
    if (scope === "global") {
      return new PluginLayout(
        path.join(ctx.home, ".claude", "skills", "recursive-praxis"),
        "recursive-praxis",
        "Deterministic RecursivePraxis kernel workflows driven through the `lambda` CLI.",
        {
          // Inside a plugin, Claude Code matches a skill's frontmatter `name`
          // against the directory it was loaded from — `skills/<slug>/` — so
          // the name is the bare slug here and prefixed everywhere else.
          skill: { at: (slug) => path.join("skills", slug, "SKILL.md"), nameAs: (slug) => slug },
          mcp: ".mcp.json",
        },
      );
    }

    return new StandaloneLayout(ctx.projectRoot, ".claude", {
      skill: { at: (slug) => path.join("skills", praxisPrefixed(slug), "SKILL.md"), nameAs: praxisPrefixed },
      command: { at: (slug) => path.join("commands", "praxis", `${slug}.md`) },
      mcp: ".mcp.json",
    });
  }

  override invocation(slug: string, scope: Scope): string {
    // Global scope is a plugin, and Claude Code namespaces a plugin's skills
    // by plugin name. Project scope keeps the standalone `/praxis:` prefix.
    return scope === "global" ? `/recursive-praxis:${slug}` : `/praxis:${slug}`;
  }

  override pipeline(scope: Scope): DocumentPipeline {
    return DocumentPipeline.for(this, scope, { frontmatter: ["name", "description"] });
  }
}
