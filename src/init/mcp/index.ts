import type { McpServer } from "../assets/DataAsset.js";

/**
 * MCP servers a host should launch.
 *
 * To add one: create `src/init/mcp/<slug>.ts` with a default export and list it
 * here.
 *
 *   import { McpServer } from "../assets/DataAsset.js";
 *
 *   export default new McpServer({
 *     slug: "recursive-praxis",
 *     title: "RecursivePraxis kernel",
 *     description: "Exposes the deterministic kernel verbs as typed MCP tools.",
 *     command: "lambda",
 *     args: ["mcp"],
 *   });
 *
 * `slug` is the key under `mcpServers` and the name every host displays. All
 * servers collapse into one config file per host, whole-file generated for the
 * same reason hooks are.
 */
export const MCP_SERVERS: readonly McpServer[] = [];
