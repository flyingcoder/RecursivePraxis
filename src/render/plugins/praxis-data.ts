import type { WorkflowDefinition } from "../../init/workflows.js";
import type { RenderTarget } from "../../hosts/types.js";

/**
 * Per-file data carried on the VFile through the pipeline.
 *
 * The host and scope are fixed when the pipeline is built, but the file being
 * produced is not — one pipeline renders both a host's skill files and its
 * command files — so the varying half travels with the file rather than as
 * plugin options.
 */
export interface PraxisFileData {
  readonly workflow: WorkflowDefinition;
  readonly target: RenderTarget;
}

export const PRAXIS_DATA_KEY = "praxis";

export function readPraxisData(data: Record<string, unknown>): PraxisFileData {
  const value = data[PRAXIS_DATA_KEY];
  if (value === undefined) {
    throw new Error(
      "render pipeline invoked without praxis file data — use DocumentPipeline.render, not processSync directly",
    );
  }
  return value as PraxisFileData;
}
