import { startStdioServer } from "../mcp/server.js";

/**
 * `lambda mcp` — speak MCP over stdio until the client disconnects.
 *
 * Unlike every other CLI command this one does not print and exit: the process
 * stays alive as the transport, and stdout carries the protocol. Nothing here
 * may write to stdout.
 */
export async function runMcp(version: string): Promise<void> {
  try {
    await startStdioServer(version);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
