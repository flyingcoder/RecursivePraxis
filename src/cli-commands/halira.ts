import { HALIRA_STEP_NAMES, haliraNext, haliraStart, type Session } from "../kernel/index.js";
import { loadSession, saveSession } from "../cli-support/session-store.js";
import { statusPayload } from "../cli-support/status-payload.js";

function printHaliraStatus(session: Session, json: boolean): void {
  const payload = statusPayload(session);
  const stepName =
    session.mode === 2 && session.haliraStep > 0
      ? HALIRA_STEP_NAMES[session.haliraStep as 1 | 2 | 3 | 4 | 5 | 6 | 7]
      : null;

  if (json) {
    console.log(JSON.stringify({ ...payload, haliraStepName: stepName }, null, 2));
    return;
  }
  if (session.mode !== 2) {
    console.log("mode 1 — HALIRA not active. Gate: mode1FailureCount >= 2, then `lambda halira start`.");
    console.log(`mode1FailureCount: ${session.mode1FailureCount}`);
    return;
  }
  console.log(`HALIRA step ${session.haliraStep} (${stepName})`);
  console.log(`legalNext: ${payload.legalNext.map((n) => n.op).join(", ") || "(none — call bind)"}`);
}

export async function runHalira(subcommand: string | undefined, baseDir: string, json: boolean): Promise<void> {
  const session = await loadSession(baseDir);

  if (subcommand === "start") {
    const result = haliraStart(session);
    if (!result.ok) {
      console.error(result.error ?? "halira start rejected");
      process.exit(1);
    }
    await saveSession(baseDir, result.value);
    printHaliraStatus(result.value, json);
    process.exit(0);
  }

  if (subcommand === "next") {
    const result = haliraNext(session);
    if (!result.ok) {
      console.error(result.error ?? "halira next rejected");
      process.exit(1);
    }
    await saveSession(baseDir, result.value);
    printHaliraStatus(result.value, json);
    process.exit(0);
  }

  if (subcommand === "status" || subcommand === undefined) {
    printHaliraStatus(session, json);
    process.exit(0);
  }

  console.error(`unknown halira subcommand "${subcommand}". Use: start | next | status`);
  process.exit(1);
}
