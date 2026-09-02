/**
 * The authoring surface. An asset file imports its class from here (or from
 * the module beside it) and nothing else.
 *
 * This file deliberately does not export the registry: an asset file that
 * imported the registry would close a cycle through the index files that
 * collect the assets. `src/init/registry.ts` is where the collection lives.
 */
export { Asset, ASSET_KINDS, type AssetInit, type AssetKind } from "./Asset.js";
export { Agent, Command, ProseAsset, Rule, Skill, type ProseAssetInit } from "./ProseAsset.js";
export {
  DataAsset,
  Hook,
  HOOK_EVENTS,
  McpServer,
  renderHooksJson,
  renderMcpJson,
  type HookEvent,
  type HookInit,
  type McpServerInit,
} from "./DataAsset.js";
export { AssetRegistry } from "./AssetRegistry.js";
