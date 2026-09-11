import {
  lambdaIntrinsic,
  lambdaPairwise,
  legalNext,
  type Operator,
  type Session,
} from "../kernel/index.js";

/**
 * Fast-clock default policy: greedily pick the legalNext candidate with the
 * lowest transition cost from the last operator (or lowest intrinsic lambda if
 * the sequence is empty). This is a cheap deterministic heuristic, not a
 * search — use `lambda solve` for that.
 *
 * Shared by `lambda step` (which applies it when `--op` is omitted) and
 * `lambda inject` (which only names it as a suggestion). One definition, so
 * the operator the briefing suggests is the operator an unflagged `step`
 * would actually apply.
 */
export function pickPolicyOperator(session: Session): Operator {
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
