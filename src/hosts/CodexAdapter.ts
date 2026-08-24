import path from "node:path";
import { HostAdapter } from "./HostAdapter.js";
import { HostLayout, StandaloneLayout } from "./layouts.js";
import type { HostId, Scope } from "./types.js";
import type { HostContext } from "../detect/context.js";
import {
  binarySignal,
  configSignal,
  envSignal,
  isPresent,
  type HostSignal,
} from "../detect/signals.js";
import { DocumentPipeline } from "../render/DocumentPipeline.js";

const OURS = /^recursive-praxis-/;

/**
 * A `.agents/skills` directory counts as evidence of Codex only when it holds
 * a skill that is not ours.
 *
 * `.agents/skills/` is exactly what this tool writes for Codex, so treating
 * its existence as detection would make the tool detect itself: one `lambda
 * init --tools codex` on a machine that has never run Codex would make every
 * later run report Codex as present. Our own output is `already-initialized`,
 * which is a different fact and is reported separately.
 */
function foreignSkillsSignal(ctx: HostContext, absPath: string, display: string): HostSignal | undefined {
  if (!ctx.exists(absPath)) return undefined;
  const foreign = ctx.readDir(absPath).filter((entry) => !OURS.test(entry));
  if (foreign.length === 0) return undefined;
  return { kind: "config", detail: `${display} (${foreign.length} non-RecursivePraxis skill(s))`, heuristic: false };
}

export class CodexAdapter extends HostAdapter {
  readonly id: HostId = "codex";
  readonly label = "Codex CLI";
  readonly verifiedAgainst = "Codex CLI skills discovery (.agents/skills), 2026-08";

  /**
   * `AGENTS.md` is deliberately absent from these probes. It is a
   * cross-vendor convention that several hosts read, so treating it as proof
   * of Codex would write Codex files on machines that have never run Codex.
   */
  protected override probes(ctx: HostContext) {
    return [
      envSignal(ctx, "CODEX_SANDBOX"),
      envSignal(ctx, "CODEX_HOME"),
      binarySignal(ctx, "codex"),
      configSignal(ctx, path.join(ctx.home, ".codex"), "~/.codex/"),
      foreignSkillsSignal(ctx, path.join(ctx.home, ".agents", "skills"), "~/.agents/skills/"),
      foreignSkillsSignal(ctx, path.join(ctx.projectRoot, ".agents", "skills"), "./.agents/skills/"),
    ].filter(isPresent);
  }

  /**
   * User-level Codex skills live at `~/.agents/skills`, not `~/.codex/skills`:
   * Codex scans `.agents/skills` upward from cwd, then `$HOME/.agents/skills`,
   * then `/etc/codex/skills`. Writing under `~/.codex/` would produce a
   * directory Codex never reads.
   */
  override layout(ctx: HostContext, scope: Scope): HostLayout {
    const root = scope === "global" ? ctx.home : ctx.projectRoot;
    return new StandaloneLayout(root, ".agents", undefined);
  }

  override invocation(workflowId: string, _scope: Scope): string {
    return `$recursive-praxis-${workflowId}`;
  }

  override pipeline(scope: Scope): DocumentPipeline {
    return DocumentPipeline.for(this, scope, { frontmatter: ["name", "description"] });
  }
}
