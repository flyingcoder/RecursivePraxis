import path from "node:path";
import { HostAdapter } from "./HostAdapter.js";
import { CommandsOnlyLayout, HostLayout } from "./layouts.js";
import type { HostId, Scope } from "./types.js";
import type { HostContext } from "../detect/context.js";
import { binarySignal, configSignal, isPresent, projectSignal } from "../detect/signals.js";
import { DocumentPipeline } from "../render/DocumentPipeline.js";

/**
 * opencode has commands, not skills: markdown with `description` frontmatter,
 * where the filename is the command name. So it gets the command surface only,
 * exactly as Codex gets the skill surface only.
 *
 * The directory name has drifted between `commands/` and `command/` across
 * opencode releases. It is resolved once, here, and `verifiedAgainst` records
 * which release that choice was checked against.
 */
const COMMANDS_DIR = "commands";

export class OpencodeAdapter extends HostAdapter {
  readonly id: HostId = "opencode";
  readonly label = "opencode";
  readonly verifiedAgainst = `opencode markdown commands (${COMMANDS_DIR}/), 2026-08`;

  protected override probes(ctx: HostContext) {
    return [
      binarySignal(ctx, "opencode"),
      configSignal(ctx, path.join(ctx.home, ".config", "opencode"), "~/.config/opencode/"),
      projectSignal(ctx, path.join(ctx.projectRoot, ".opencode"), "./.opencode/"),
      projectSignal(ctx, path.join(ctx.projectRoot, "opencode.json"), "./opencode.json"),
      projectSignal(ctx, path.join(ctx.projectRoot, "opencode.jsonc"), "./opencode.jsonc"),
    ].filter(isPresent);
  }

  override layout(ctx: HostContext, scope: Scope): HostLayout {
    return new CommandsOnlyLayout(
      scope === "global"
        ? path.join(ctx.home, ".config", "opencode", COMMANDS_DIR)
        : path.join(ctx.projectRoot, ".opencode", COMMANDS_DIR),
    );
  }

  override invocation(workflowId: string, _scope: Scope): string {
    return `/praxis-${workflowId}`;
  }

  override pipeline(scope: Scope): DocumentPipeline {
    return DocumentPipeline.for(this, scope, { frontmatter: ["description"] });
  }
}
