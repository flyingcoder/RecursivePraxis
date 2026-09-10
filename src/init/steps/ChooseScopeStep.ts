import path from "node:path";
import { InitStep } from "./InitStep.js";
import type { WizardIO } from "../WizardIO.js";
import type { HostAdapter } from "../../hosts/HostAdapter.js";
import type { HostContext } from "../../detect/context.js";
import { isScope, type Scope } from "../../hosts/types.js";

/**
 * Step 3. Never inferred from detection.
 *
 * Writing under `~` is a different act from writing in the repository the
 * human is standing in, and detection has nothing to say about which one they
 * consented to. So this is always an explicit answer or an explicit
 * `--scope global`; the flag's absence means `project`, the narrower of the two.
 */
export class ChooseScopeStep extends InitStep<readonly HostAdapter[], Scope> {
  readonly ordinal = 3;
  readonly title = "Where should these be installed?";

  constructor(private readonly ctx: HostContext) {
    super();
  }

  override async run(hosts: readonly HostAdapter[], io: WizardIO): Promise<Scope> {
    this.announce(io);

    const sample = (scope: Scope): string =>
      hosts.length === 0
        ? "—"
        : hosts
            .slice(0, 3)
            .map((host) => {
              const base = scope === "global" ? this.ctx.home : this.ctx.projectRoot;
              const rel = path.relative(base, host.layout(this.ctx, scope).root);
              return `${scope === "global" ? "~/" : ""}${rel.split(path.sep).join("/")}`;
            })
            .join(" ");

    const answer = await io.singleSelect({
      flag: "--scope",
      prompt: this.title,
      fallback: "project",
      options: [
        {
          value: "project",
          label: "Per-project",
          hint: `${sample("project")} — this repository only`,
          selected: true,
        },
        {
          value: "global",
          label: "Global",
          hint: `${sample("global")} — every project on this machine`,
          selected: false,
        },
      ],
    });

    if (!isScope(answer)) {
      throw new Error(`unknown scope: ${answer} (expected project or global)`);
    }
    return answer;
  }
}
