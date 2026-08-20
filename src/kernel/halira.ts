import type { HaliraStep, Operator, Session } from "./types.js";

export const MODE2_GATE_THRESHOLD = 2;

export const HALIRA_STEP_NAMES: Readonly<Record<Exclude<HaliraStep, 0>, string>> = {
  1: "Potentia",
  2: "Boundary",
  3: "Recursion",
  4: "Integration",
  5: "Anomaly",
  6: "Rupture",
  7: "Recognition",
};

/**
 * The candidate operator(s) for the session's current HALIRA program-counter
 * position, before hard-constraint filtering. Step 5 and 6 are conditional
 * on what actually happened at steps 3 and 6 respectively (tracked on the
 * session, not inferred), per the HALIRA table:
 *   1 Potentia -> Seed          5 Anomaly -> Non; Para/Retro if step 3 used Meta
 *   2 Boundary -> Axis          6 Rupture -> Ortho, then Para once Ortho is used
 *   3 Recursion -> Meta (<=2)   7 Recognition -> (no step op; only bind() finalizes)
 *   4 Integration -> Weave
 */
export function haliraCandidateOps(session: Session): readonly Operator[] {
  switch (session.haliraStep) {
    case 1:
      return ["Seed"];
    case 2:
      return ["Axis"];
    case 3:
      return ["Meta"];
    case 4:
      return ["Weave"];
    case 5:
      return session.metaUsedInStep3 ? ["Para", "Retro"] : ["Non"];
    case 6:
      return session.orthoUsedInStep6 ? ["Ortho", "Para"] : ["Ortho"];
    case 7:
      return [];
    default:
      return [];
  }
}
