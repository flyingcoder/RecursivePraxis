import { Command } from "../assets/ProseAsset.js";
import diagnoseSkill from "../skills/diagnose.js";

/**
 * Same prose as the diagnose skill. To let this command diverge, replace the
 * call below with `new Command({ slug, title, description, body })` and give
 * it its own body — nothing outside this file has to change.
 */
export default Command.mirroring(diagnoseSkill);
