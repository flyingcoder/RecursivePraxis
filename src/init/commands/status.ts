import { Command } from "../assets/ProseAsset.js";
import statusSkill from "../skills/status.js";

/**
 * Same prose as the status skill. To let this command diverge, replace the
 * call below with `new Command({ slug, title, description, body })` and give
 * it its own body — nothing outside this file has to change.
 */
export default Command.mirroring(statusSkill);
