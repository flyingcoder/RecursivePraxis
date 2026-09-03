import type { Command } from "../assets/ProseAsset.js";
import status from "./status.js";
import analyze from "./analyze.js";
import solve from "./solve.js";
import diagnose from "./diagnose.js";
import intent from "./intent.js";
import derive from "./derive.js";
import session from "./session.js";
import ir from "./ir.js";
import metaPrompt from "./meta-prompt.js";

/**
 * Authoring order. It is preserved in generated file lists, `--json` output,
 * and the install manifest, so reordering this array is a visible diff.
 *
 * To add a command: create `src/init/commands/<slug>.ts` with a default export
 * and add it here. Nothing else enumerates commands.
 */
export const COMMANDS: readonly Command[] = [
  status,
  analyze,
  solve,
  diagnose,
  intent,
  derive,
  session,
  ir,
  metaPrompt,
];
