import { InitStep } from "./InitStep.js";
import type { Choice, WizardIO } from "../WizardIO.js";
import type { DetectionReport } from "./DetectHostsStep.js";
import type { HostRegistry } from "../../hosts/HostRegistry.js";
import type { HostAdapter } from "../../hosts/HostAdapter.js";
import { CONFIDENCE_LABEL } from "../../detect/signals.js";
import { isHostId, type HostId } from "../../hosts/types.js";

/**
 * Step 2. Detection sets the default checkbox state and nothing more.
 *
 * Every host stays selectable, including undetected ones: installing ahead of
 * a host is a legitimate thing to do, and refusing it would make detection
 * authoritative over the person it is supposed to be informing.
 */
export class ChooseHostsStep extends InitStep<DetectionReport, readonly HostAdapter[]> {
  readonly ordinal = 2;
  readonly title = "Which host agents should RecursivePraxis configure?";

  constructor(private readonly registry: HostRegistry) {
    super();
  }

  override async run(input: DetectionReport, io: WizardIO): Promise<readonly HostAdapter[]> {
    this.announce(io);

    const options: Choice[] = input.detections.map((detection) => ({
      value: detection.hostId,
      label: detection.label,
      hint:
        detection.confidence === "absent"
          ? "not found on this machine"
          : detection.defaultSelected
            ? `detected: ${CONFIDENCE_LABEL[detection.confidence]}`
            : `detected: ${CONFIDENCE_LABEL[detection.confidence]} — not selected by default`,
      selected: detection.defaultSelected,
    }));

    const chosen = await io.multiSelect({ flag: "--tools", prompt: this.title, options });

    const unknown = chosen.filter((value) => !isHostId(value));
    if (unknown.length > 0) {
      throw new Error(`unknown host${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}`);
    }

    const selected = new Set(chosen as readonly HostId[]);
    return this.registry.all().filter((adapter) => selected.has(adapter.id));
  }
}
