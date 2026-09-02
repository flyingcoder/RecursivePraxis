import { Command } from "../assets/ProseAsset.js";
import analyzeSkill from "../skills/analyze.js";

/**
 * Same prose as the analyze skill. To let this command diverge, replace the
 * call below with `new Command({ slug, title, description, body })` and give
 * it its own body — nothing outside this file has to change.
 */
export default Command.mirroring(analyzeSkill);
