import type { ProseAsset } from "../../init/assets/ProseAsset.js";
import type { RenderTarget } from "../../hosts/types.js";

/**
 * Per-file data carried on the VFile through the pipeline.
 *
 * The host and scope are fixed when the pipeline is built, but the file being
 * produced is not — one pipeline renders every prose kind a host takes — so the varying half travels with the file rather than as
 * plugin options.
 */
export interface PraxisFileData {
  readonly asset: ProseAsset;
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
