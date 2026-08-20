import { MODE2_GATE_THRESHOLD, bind, recordMode1Failure } from "../kernel/index.js";
import { loadSession, saveSession } from "../cli-support/session-store.js";

/**
 * `bind` has no override. A rejected Mode-1 bind attempt is itself a
 * failed Mode-1 trace — record it against mode1FailureCount so repeated
 * failures mechanically unlock `halira start` (the Mode-2 gate cannot be
 * reached by prose escalation, only by this counter).
 */
export async function runBind(rest: string[], baseDir: string, json: boolean): Promise<void> {
  if (rest.includes("--force")) {
    console.error("bind cannot be forced — fail-closed by design, no bypass exists");
    process.exit(1);
  }

  const session = await loadSession(baseDir);
  const result = bind(session);

  if (!result.ok) {
    const next = session.mode === 1 ? recordMode1Failure(session) : session;
    await saveSession(baseDir, next);

    const gateNote =
      next.mode === 1 ? ` (mode1FailureCount now ${next.mode1FailureCount}/${MODE2_GATE_THRESHOLD})` : "";

    if (json) {
      console.log(
        JSON.stringify({ ok: false, error: result.error, mode1FailureCount: next.mode1FailureCount }, null, 2),
      );
    } else {
      console.error(`${result.error ?? "bind rejected"}${gateNote}`);
    }
    process.exit(1);
  }

  await saveSession(baseDir, result.value);
  if (json) {
    console.log(JSON.stringify({ ok: true, bound: true, sequence: result.value.sequence }, null, 2));
  } else {
    console.log(`bound: ${result.value.sequence.join(" ∘ ")}`);
  }
  process.exit(0);
}
