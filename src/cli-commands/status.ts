import { loadSession } from "../cli-support/session-store.js";
import { statusPayload } from "../cli-support/status-payload.js";
import { AttractorVocabulary } from "../vocab/attractors.js";

export async function runStatus(baseDir: string, json: boolean): Promise<void> {
  const session = await loadSession(baseDir);
  const payload = statusPayload(session);

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    process.exit(0);
  }

  console.log(`attractor: ${payload.attractor}  (V=${payload.V.toFixed(3)})`);
  console.log(`  ${AttractorVocabulary.gloss(payload.attractor)}`);
  // Stated only for the void, and the one thing a session sitting in it needs.
  const escape = AttractorVocabulary.escapeAdvice(payload.attractor);
  if (escape !== undefined) console.log(`  ${escape}`);
  console.log(`state: D=${payload.state.D.toFixed(3)} C=${payload.state.C.toFixed(3)}`);
  console.log(`lambda_eff: ${payload.lambdaEffective.toFixed(3)} (${payload.lambdaBand})`);
  console.log(`mode: ${payload.mode}${payload.haliraStep ? ` (HALIRA step ${payload.haliraStep})` : ""}`);
  console.log(`sequence length: ${payload.sequenceLength}  bound: ${payload.bound}`);
  console.log(`legalNext: ${payload.legalNext.map((n) => n.op).join(", ") || "(none)"}`);
  process.exit(0);
}
