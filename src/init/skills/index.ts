import type { Skill } from "../assets/ProseAsset.js";
import status from "./status.js";
import analyze from "./analyze.js";
import solve from "./solve.js";
import diagnose from "./diagnose.js";
import task from "./task.js";
import intent from "./intent.js";
import derive from "./derive.js";
import session from "./session.js";
import ir from "./ir.js";

/**
 * Authoring order. It is preserved in generated file lists, `--json` output,
 * and the install manifest, so reordering this array is a visible diff.
 *
 * To add a skill: create `src/init/skills/<slug>.ts` with a default export
 * and add it here. Nothing else enumerates skills.
 */
export const SKILLS: readonly Skill[] = [
  status,
  analyze,
  solve,
  diagnose,
  task,
  intent,
  derive,
  session,
  ir,
];
