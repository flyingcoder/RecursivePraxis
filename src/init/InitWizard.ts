import { DetectHostsStep } from "./steps/DetectHostsStep.js";
import { ChooseHostsStep } from "./steps/ChooseHostsStep.js";
import { ChooseScopeStep } from "./steps/ChooseScopeStep.js";
import { GenerateStep, type InitReport } from "./steps/GenerateStep.js";
import type { WizardIO } from "./WizardIO.js";
import type { HostRegistry } from "../hosts/HostRegistry.js";
import type { HostContext } from "../detect/context.js";
import type { WorkflowDefinition } from "./workflows.js";
import type { FileWriter } from "./write.js";

/**
 * The four steps, as four lines.
 *
 * Reordering them, or proving that no fifth step exists, is a code review of
 * one method — which is the reason the steps are objects rather than inlined
 * prompts. Everything the CLI adds around this (flag parsing, choosing a
 * `WizardIO`, printing the report) stays outside.
 */
export class InitWizard {
  constructor(
    private readonly registry: HostRegistry,
    private readonly ctx: HostContext,
    private readonly io: WizardIO,
    private readonly workflows: readonly WorkflowDefinition[],
    private readonly version: string,
    private readonly writer: FileWriter | undefined = undefined,
  ) {}

  async run(): Promise<InitReport> {
    const detection = await new DetectHostsStep(this.registry, this.ctx, this.workflows).run(undefined, this.io);
    const hosts = await new ChooseHostsStep(this.registry).run(detection, this.io);
    const scope = await new ChooseScopeStep(this.ctx).run(hosts, this.io);
    const generate =
      this.writer === undefined
        ? new GenerateStep(this.ctx, this.workflows, this.version)
        : new GenerateStep(this.ctx, this.workflows, this.version, this.writer);
    return generate.run({ hosts, scope, detection }, this.io);
  }
}
