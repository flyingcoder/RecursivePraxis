import {
  lambdaIntrinsic,
  lambdaPairwise,
  legalNext,
  step,
  type Operator,
  type Session,
} from "../kernel/index.js";
import { parseOperator } from "../cli-support/parse.js";
import { loadSession, saveSession } from "../cli-support/session-store.js";
import { statusPayload } from "../cli-support/status-payload.js";

/**
 * Fast-clock default policy when --op is omitted: greedily pick the
 * legalNext candidate with the lowest transition cost from the last
 * operator (or lowest intrinsic lambda if the sequence is empty). This is
 * a cheap deterministic heuristic, not a search — use `lambda solve` for that.
 */
function pickPolicyOperator(session: Session): Operator {
  const candidates = legalNext(session);
  if (candidates.length === 0) {
    throw new Error("legalNext is empty; no operator can be auto-selected");
  }
  const lastOp = session.sequence.length > 0 ? session.sequence[session.sequence.length - 1] : null;

  let best = candidates[0]!;
  let bestCost = lastOp ? lambdaPairwise(lastOp, best) : lambdaIntrinsic(best);
  for (const candidate of candidates.slice(1)) {
    const cost = lastOp ? lambdaPairwise(lastOp, candidate) : lambdaIntrinsic(candidate);
    if (cost < bestCost) {
      best = candidate;
      bestCost = cost;
    }
  }
  return best;
}

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
