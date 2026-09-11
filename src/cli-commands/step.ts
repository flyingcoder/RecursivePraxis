import { step, type Operator } from "../kernel/index.js";
import { parseOperator } from "../cli-support/parse.js";
import { loadSession, saveSession } from "../cli-support/session-store.js";
import { statusPayload } from "../cli-support/status-payload.js";
import { pickPolicyOperator } from "../cli-support/suggest-operator.js";

function extractOpFlag(rest: string[]): string | undefined {
  const index = rest.indexOf("--op");
  return index >= 0 ? rest[index + 1] : undefined;
}

export async function runStep(rest: string[], baseDir: string, json: boolean): Promise<void> {
  const session = await loadSession(baseDir);
  const opArg = extractOpFlag(rest);

  let op: Operator;
  try {
    op = opArg ? parseOperator(opArg) : pickPolicyOperator(session);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }

  const result = step(session, op);
  if (!result.ok) {
    console.error(result.error ?? "step rejected");
    process.exit(1);
  }

  await saveSession(baseDir, result.value);
  const payload = statusPayload(result.value);
  if (json) {
    console.log(JSON.stringify({ applied: op, ...payload }, null, 2));
  } else {
    console.log(`applied: ${op} -> attractor ${payload.attractor} (V=${payload.V.toFixed(3)})`);
  }
  process.exit(0);
}
