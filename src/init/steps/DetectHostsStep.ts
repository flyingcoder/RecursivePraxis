import { InitStep } from "./InitStep.js";
import type { WizardIO } from "../WizardIO.js";
import type { HostRegistry } from "../../hosts/HostRegistry.js";
import type { HostDetection } from "../../hosts/HostAdapter.js";
import type { HostContext } from "../../detect/context.js";
import { CONFIDENCE_LABEL } from "../../detect/signals.js";
import type { WorkflowDefinition } from "../workflows.js";

export interface DetectionReport {
  readonly detections: readonly HostDetection[];
}

/**
 * Step 1. Prints evidence, never a bare verdict.
 *
 * Every signal is shown with the path or variable it came from, and env
 * markers are labelled `(heuristic)` because they are observed rather than
 * contracted. The human has to be able to disagree with this table in Step 2;
 * a row that says only "detected" gives them nothing to disagree with.
 */
export class DetectHostsStep extends InitStep<void, DetectionReport> {
  readonly ordinal = 1;
  readonly title = "Detecting host agents";

  constructor(
    private readonly registry: HostRegistry,
    private readonly ctx: HostContext,
    private readonly workflows: readonly WorkflowDefinition[],
  ) {
    super();
  }

  override async run(_input: void, io: WizardIO): Promise<DetectionReport> {
    this.announce(io);
    const detections = this.registry.detectAll(this.ctx, this.workflows);

    io.table(
      detections.map((detection) => ({
        label: detection.label,
        status: CONFIDENCE_LABEL[detection.confidence],
        evidence:
          detection.signals.length === 0
            ? "—"
            : detection.signals.map((signal) => signal.detail).join(" · "),
      })),
    );

    const initialized = detections.filter((detection) => detection.alreadyInitialized);
    if (initialized.length > 0) {
      io.note("");
      io.note(
        `  already initialized here: ${initialized.map((d) => d.label).join(", ")} (our own files — not counted as detection)`,
      );
    }

    return { detections };
  }
}
