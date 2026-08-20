import { describe, expect, it } from "vitest";
import { createInitialSession, OPERATORS } from "../../src/kernel/types.js";
import {
  bind,
  haliraNext,
  haliraStart,
  legalNext,
  recordMode1Failure,
  step,
} from "../../src/kernel/session.js";

const START_STATE = { D: 0.5, C: 0.5 };

describe("legalNext (Mode 1)", () => {
  it("returns all 20 operators for a fresh session", () => {
    const session = createInitialSession(START_STATE);
    expect(legalNext(session).sort()).toEqual([...OPERATORS].sort());
  });
});

describe("step (fail-closed)", () => {
  it("rejects an illegal operator without mutating the original session", () => {
    let session = createInitialSession(START_STATE);
    const afterMeta = step(session, "Meta");
    expect(afterMeta.ok).toBe(true);
    session = afterMeta.value;

    const illegal = step(session, "Non"); // Meta -> Non forbidden
    expect(illegal.ok).toBe(false);
    expect(illegal.value.sequence).toEqual(["Meta"]); // unchanged
    expect(session.sequence).toEqual(["Meta"]); // original untouched
  });

  it("applies a legal operator: updates state and appends to sequence", () => {
    const session = createInitialSession(START_STATE);
    const result = step(session, "Kata");
    expect(result.ok).toBe(true);
    expect(result.value.sequence).toEqual(["Kata"]);
    expect(result.value.state.D).toBeCloseTo(0.3, 10);
    expect(result.value.state.C).toBeCloseTo(0.35, 10);
  });

  it("records an anomaly artifact on Non", () => {
    const session = createInitialSession(START_STATE);
    const result = step(session, "Non");
    expect(result.ok).toBe(true);
    expect(result.value.anomalyArtifact).toEqual({ kind: "Non", recordedAfter: null });
  });

  it("records an anomaly artifact on Para/Retro only when directly preceded by Meta", () => {
    let session = createInitialSession(START_STATE);
    session = step(session, "Meta").value;
    const afterRetro = step(session, "Retro");
    expect(afterRetro.value.anomalyArtifact).toEqual({ kind: "Retro", recordedAfter: "Meta" });

    const freshSession = createInitialSession(START_STATE);
    const bareRetro = step(freshSession, "Retro");
    expect(bareRetro.value.anomalyArtifact).toBeNull();
  });
});

describe("bind (fail-closed)", () => {
  it("fails on an empty sequence", () => {
    const session = createInitialSession(START_STATE);
    const result = bind(session);
    expect(result.ok).toBe(false);
  });

  it("fails when the sequence ends on Ana", () => {
    let session = createInitialSession(START_STATE);
    session = step(session, "Non").value; // anomaly artifact present
    session = step(session, "Ana").value;
    const result = bind(session);
    expect(result.ok).toBe(false);
  });

  it("fails when no anomaly artifact exists, even with a non-empty, non-Ana-ending sequence", () => {
    let session = createInitialSession(START_STATE);
    session = step(session, "Kata").value;
    const result = bind(session);
    expect(result.ok).toBe(false);
  });

  it("succeeds when an anomaly artifact exists and the sequence does not end on Ana", () => {
    let session = createInitialSession(START_STATE);
    session = step(session, "Non").value;
    session = step(session, "Kata").value;
    const result = bind(session);
    expect(result.ok).toBe(true);
    expect(result.value.bound).toBe(true);
  });
});

describe("Mode-2 gate", () => {
  it("refuses halira start below the failure threshold", () => {
    const session = createInitialSession(START_STATE);
    expect(haliraStart(session).ok).toBe(false);
  });

  it("allows halira start once mode1FailureCount reaches the threshold (default 2)", () => {
    let session = createInitialSession(START_STATE);
    session = recordMode1Failure(session);
    expect(haliraStart(session).ok).toBe(false); // only 1 failure so far
    session = recordMode1Failure(session);
    const started = haliraStart(session);
    expect(started.ok).toBe(true);
    expect(started.value.mode).toBe(2);
    expect(started.value.haliraStep).toBe(1);
  });
});

describe("HALIRA program counter (full lifecycle)", () => {
  it("walks Seed -> Axis -> Meta -> Weave -> Retro -> Ortho -> Bind, gating legalNext at each step", () => {
    let session = createInitialSession(START_STATE);
    session = recordMode1Failure(session);
    session = recordMode1Failure(session);
    session = haliraStart(session).value;

    expect(legalNext(session)).toEqual(["Seed"]);
    session = step(session, "Seed").value;

    session = haliraNext(session).value;
    expect(session.haliraStep).toBe(2);
    expect(legalNext(session)).toEqual(["Axis"]);
    session = step(session, "Axis").value;

    session = haliraNext(session).value;
    expect(session.haliraStep).toBe(3);
    expect(legalNext(session)).toEqual(["Meta"]);
    session = step(session, "Meta").value;
    expect(session.metaUsedInStep3).toBe(true);
    // A single Meta hasn't hit the max-consecutive-2 limit yet.
    expect(legalNext(session)).toEqual(["Meta"]);

    session = haliraNext(session).value;
    expect(session.haliraStep).toBe(4);
    expect(legalNext(session)).toEqual(["Weave"]);
    session = step(session, "Weave").value;

    session = haliraNext(session).value;
    expect(session.haliraStep).toBe(5);
    // metaUsedInStep3 -> Anomaly step requires Para/Retro, not plain Non.
    expect(legalNext(session).sort()).toEqual(["Para", "Retro"].sort());
    session = step(session, "Retro").value;
    expect(session.anomalyArtifact).not.toBeNull();

    session = haliraNext(session).value;
    expect(session.haliraStep).toBe(6);
    expect(legalNext(session)).toEqual(["Ortho"]);
    session = step(session, "Ortho").value;
    expect(session.orthoUsedInStep6).toBe(true);
    expect(legalNext(session).sort()).toEqual(["Ortho", "Para"].sort());

    session = haliraNext(session).value;
    expect(session.haliraStep).toBe(7);
    expect(legalNext(session)).toEqual([]); // nothing left to step; only bind() remains

    const result = bind(session);
    expect(result.ok).toBe(true);
    expect(result.value.bound).toBe(true);
  });

  it("cannot jump to Bind before reaching HALIRA step 7", () => {
    let session = createInitialSession(START_STATE);
    session = recordMode1Failure(session);
    session = recordMode1Failure(session);
    session = haliraStart(session).value;
    session = step(session, "Seed").value; // anomaly artifact absent too, but step check should fail first either way
    const result = bind(session);
    expect(result.ok).toBe(false);
  });
});
