import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DERIVE_TOOLS, META_PROMPT_TOOLS, type ToolDefinition } from "./tools.js";

/**
 * The stdio MCP server `lambda mcp` runs.
 *
 * One rule governs everything in this file: stdout belongs to the protocol.
 * A stray `console.log` anywhere on a tool's code path corrupts the JSON-RPC
 * stream and the client sees a parse error rather than a result, so diagnostics
 * go to stderr and nowhere else.
 */

/** Renders a handler's return value into the content shape the protocol wants. */
function toolResult(value: unknown): {
  content: { type: "text"; text: string }[];
  isError?: boolean;
} {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function errorResult(error: unknown): {
  content: { type: "text"; text: string }[];
  isError?: boolean;
} {
  // A rejected label claim arrives here. It is a real answer — "the kernel
  // disagrees with what you called this" — so it is reported as a tool error
  // the model can read and act on, not thrown into the transport.
  return {
    content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
    isError: true,
  };
}

export function registerTool(server: McpServer, tool: ToolDefinition): void {
  server.registerTool(
    tool.name,
    {
      title: tool.title,
      description: tool.description,
      // The whole schema, not its `.shape`. Handing over the shape makes the
      // SDK rebuild a plain `z.object`, which silently STRIPS unknown keys —
      // so a payload smuggling `D` and `C` alongside the signals would be
      // accepted with the pair quietly dropped. Passing the schema keeps
      // `strictObject` intact, so that payload is rejected outright and the
      // published JSON Schema carries `additionalProperties: false`.
      inputSchema: tool.inputSchema,
    },
    (args: unknown) => {
      try {
        const parsed = tool.inputSchema.parse(args);
        return toolResult(tool.handler(parsed as never));
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

export function createServer(version: string): McpServer {
  const server = new McpServer({ name: "recursive-praxis", version });
  for (const tool of [...DERIVE_TOOLS, ...META_PROMPT_TOOLS]) registerTool(server, tool);
  return server;
}

export async function startStdioServer(version: string): Promise<void> {
  const server = createServer(version);
  await server.connect(new StdioServerTransport());
}
