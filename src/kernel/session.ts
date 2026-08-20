import type { AnomalyArtifact, KernelResult, Operator, Session } from "./types.js";
import { OPERATORS, fail, ok } from "./types.js";
import { violatesHardConstraint, violatesSequenceEndConstraint } from "./constraints.js";
import { applyOperator } from "./phasePortrait.js";
import { haliraCandidateOps, MODE2_GATE_THRESHOLD } from "./halira.js";

export { MODE2_GATE_THRESHOLD } from "./halira.js";

/** The public legalNext: Mode-1 sees all 20 operators, Mode-2 sees only the
 * current HALIRA step's candidates — both filtered by the shared hard
 * constraints. Illegal ops never appear in this list (fail-closed by menu). */
export function legalNext(session: Session): Operator[] {
  const candidates = session.mode === 2 ? haliraCandidateOps(session) : OPERATORS;
  return candidates.filter((op) => !violatesHardConstraint(session.sequence, op));
}

function nextAnomalyArtifact(
  session: Session,
  op: Operator,
): AnomalyArtifact | null {
  const prevLast = session.sequence.length > 0 ? session.sequence[session.sequence.length - 1]! : null;

  if (op === "Non") {
    return { kind: "Non", recordedAfter: prevLast };
  }
  if (op === "Para" || op === "Retro") {
    if (prevLast === "Meta") {
      return { kind: op, recordedAfter: "Meta" };
    }
    // HALIRA's step 5 (Anomaly) interposes Weave (step 4) between the
    // step-3 Meta and this op, so adjacency doesn't hold even though
    // metaUsedInStep3 already proves the condition this artifact certifies.
    if (session.mode === 2 && session.haliraStep === 5 && session.metaUsedInStep3) {
      return { kind: op, recordedAfter: "Meta" };
    }
  }
  return session.anomalyArtifact;
}

export function step(session: Session, op: Operator): KernelResult<Session> {
  if (session.bound) {
    return fail(session, "session already bound; no further steps allowed");
  }
  if (!legalNext(session).includes(op)) {
    return fail(session, `${op} is not in legalNext for the current session`);
  }

  const newState = applyOperator(session.state, op);
  const newSequence = [...session.sequence, op];
  const anomalyArtifact = nextAnomalyArtifact(session, op);

  const metaUsedInStep3 =
    session.metaUsedInStep3 || (session.mode === 2 && session.haliraStep === 3 && op === "Meta");
  const orthoUsedInStep6 =
    session.orthoUsedInStep6 || (session.mode === 2 && session.haliraStep === 6 && op === "Ortho");

  return ok({
    ...session,
    state: newState,
    sequence: newSequence,
    anomalyArtifact,
    metaUsedInStep3,
    orthoUsedInStep6,
  });
}

/** Fails unless: non-empty sequence, does not end on Ana, an anomaly
 * artifact is recorded, and (Mode 2 only) HALIRA has reached step 7 —
 * cannot jump to Bind. */
export function bind(session: Session): KernelResult<Session> {
  if (session.bound) {
    return fail(session, "session already bound");
  }
  if (session.sequence.length === 0) {
    return fail(session, "cannot bind an empty sequence");
  }
  if (violatesSequenceEndConstraint(session.sequence)) {
    return fail(session, "sequence must not end on Ana");
  }
  if (!session.anomalyArtifact) {
    return fail(session, "no anomaly artifact recorded (Non, or Para/Retro after Meta)");
  }
  if (session.mode === 2 && session.haliraStep !== 7) {
    return fail(session, "HALIRA has not reached step 7 (Recognition); cannot jump to Bind");
  }

  return ok({ ...session, bound: true });
}

export function recordMode1Failure(session: Session): Session {
  return { ...session, mode1FailureCount: session.mode1FailureCount + 1 };
}

export function haliraStart(session: Session): KernelResult<Session> {
  if (session.bound) {
    return fail(session, "session already bound");
  }
  if (session.mode === 2) {
    return fail(session, "already in Mode 2");
  }
  if (session.mode1FailureCount < MODE2_GATE_THRESHOLD) {
    return fail(
      session,
      `Mode-2 gate not met: ${session.mode1FailureCount}/${MODE2_GATE_THRESHOLD} recorded Mode-1 failures`,
    );
  }

  return ok({
    ...session,
    mode: 2,
    haliraStep: 1,
    metaUsedInStep3: false,
    orthoUsedInStep6: false,
  });
}

export function haliraNext(session: Session): KernelResult<Session> {
  if (session.mode !== 2) {
    return fail(session, "not in Mode 2");
  }
  if (session.haliraStep === 0) {
    return fail(session, "HALIRA has not been started");
  }
  if (session.haliraStep >= 7) {
    return fail(session, "already at HALIRA step 7 (Recognition); call bind");
  }

  return ok({ ...session, haliraStep: ((session.haliraStep + 1) as Session["haliraStep"]) });
}
