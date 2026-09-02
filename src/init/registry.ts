import { AssetRegistry } from "./assets/AssetRegistry.js";
import { SKILLS } from "./skills/index.js";
import { COMMANDS } from "./commands/index.js";
import { AGENTS } from "./agents/index.js";
import { RULES } from "./rules/index.js";
import { HOOKS } from "./hooks/index.js";
import { MCP_SERVERS } from "./mcp/index.js";

/**
 * Everything this build installs.
 *
 * The six index files above are the only places assets are enumerated. A new
 * asset is one file in its kind's directory plus one line in that directory's
 * index — the hosts, the wizard, `doctor`, `sync`, and `uninstall` need no
 * edits, because none of them enumerates content.
 */
export const ASSETS = new AssetRegistry([
  ...SKILLS,
  ...COMMANDS,
  ...AGENTS,
  ...RULES,
  ...HOOKS,
  ...MCP_SERVERS,
]);
