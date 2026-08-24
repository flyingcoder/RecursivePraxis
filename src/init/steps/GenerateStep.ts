import { InitStep } from "./InitStep.js";
import type { WizardIO } from "../WizardIO.js";
import { FileWriter, type FileWriteResult } from "../write.js";
import type { HostAdapter, PlannedFile } from "../../hosts/HostAdapter.js";
import type { HostContext } from "../../detect/context.js";
import type { HostId, Scope } from "../../hosts/types.js";
import type { WorkflowDefinition } from "../workflows.js";
import type { Confidence } from "../../detect/signals.js";
import { InstallManifest } from "../../manifest/InstallManifest.js";
import { abbreviate } from "../../manifest/InstallManifest.js";
import type { DetectionReport } from "./DetectHostsStep.js";

export interface Selection {
  readonly hosts: readonly HostAdapter[];
  readonly scope: Scope;
  readonly detection: DetectionReport;
}

export interface HostReport {
  readonly hostId: HostId;
  readonly hostLabel: string;
  readonly root: string;
  readonly invocations: readonly { workflowId: string; invocation: string }[];
}

export interface InitReport {
  readonly scope: Scope;
  readonly hosts: readonly HostReport[];
  readonly files: readonly FileWriteResult[];
  /** Undefined when nothing was installed and no prior record exists to update. */
  readonly manifestPath: string | undefined;
  /** The non-interactive command equivalent to the answers just given. */
  readonly equivalentFlags: string;
}

/**
 * Step 4. Writes, with no confirmation prompt in front of it.
 *
 * That is safe by construction rather than by care: the managed-marker merge
 * preserves anything a user appended and reports `skipped` for a file it does
 * not own, so there is no destructive outcome for a preview to protect
 * against. A dry-run step here would be ceremony over an operation that
 * already cannot clobber.
 */
export class GenerateStep extends InitStep<Selection, InitReport> {
  readonly ordinal = 4;
  readonly title = "Generating";

  constructor(
    private readonly ctx: HostContext,
    private readonly workflows: readonly WorkflowDefinition[],
    private readonly version: string,
    private readonly writer: FileWriter = new FileWriter(),
  ) {
    super();
  }

  override async run(selection: Selection, io: WizardIO): Promise<InitReport> {
    this.announce(io);

    const { hosts, scope } = selection;
    const planned: PlannedFile[] = [];
    const hostRoots = new Map<HostId, string>();
    const detectedAs = new Map<HostId, Confidence>(
      selection.detection.detections.map((detection) => [detection.hostId, detection.confidence]),
    );

    const hostReports: HostReport[] = hosts.map((host) => {
      const files = host.plan(this.workflows, this.ctx, scope, { version: this.version });
      planned.push(...files);
      const root = host.layout(this.ctx, scope).root;
      hostRoots.set(host.id, root);
      return {
        hostId: host.id,
        hostLabel: host.label,
        root: scope === "global" ? abbreviate(this.ctx.home, root) : root,
        invocations: this.workflows.map((workflow) => ({
          workflowId: workflow.id,
          invocation: host.invocation(workflow.id, scope),
        })),
      };
    });

    const results: FileWriteResult[] = [];
    for (const file of planned) {
      results.push(await this.writer.write(file));
    }

    // Only files that actually landed are recorded: a `skipped` file belongs
    // to the user, and listing it would let `uninstall` delete what it never
    // wrote.
    const owned = planned.filter((file) =>
      results.some((result) => result.absPath === file.absPath && result.action !== "skipped"),
    );

    const manifest = InstallManifest.fromPlan(
      scope,
      this.version,
      { home: this.ctx.home, projectRoot: this.ctx.projectRoot },
      owned,
      detectedAs,
      hostRoots,
    );
    // `--tools none` installs nothing, so it should not leave state behind
    // either. An existing record is still refreshed, so that de-selecting a
    // host and re-running keeps the manifest honest about what is installed.
    const hadRecord =
      (await InstallManifest.load(scope, { home: this.ctx.home, projectRoot: this.ctx.projectRoot })) !== undefined;
    const manifestPath = owned.length > 0 || hadRecord ? await manifest.save() : undefined;

    return {
      scope,
      hosts: hostReports,
      files: results,
      manifestPath,
      equivalentFlags: `lambda init --tools ${hosts.length === 0 ? "none" : hosts.map((h) => h.id).join(",")} --scope ${scope}`,
    };
  }
}
