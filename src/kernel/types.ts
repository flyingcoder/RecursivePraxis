export const OPERATORS = [
  "Ana",
  "Kata",
  "Meta",
  "Para",
  "Non",
  "Telo",
  "Retro",
  "Ortho",
  "Pro",
  "Echo",
  "Braid",
  "Fold",
  "Seed",
  "Crux",
  "Weave",
  "Bind",
  "Axis",
  "Vale",
  "Flux",
  "Latch",
] as const;

export type Operator = (typeof OPERATORS)[number];

export type OperatorClass =
  | "A-Constructive"
  | "B-Disruptive"
  | "C-Reflexive"
  | "D-Structural";

export interface DissipationState {
  readonly D: number;
  readonly C: number;
}

/**
 * Phase-portrait attractor labels, using the formalism's own glyphs.
 * Traces written before schema 1.2.0 recorded the collapse attractor as the
 * ASCII string "void"; see LEGACY_VOID_ATTRACTOR in engine/orchestrator.ts.
 */
export type AttractorLabel = "J=0" | "S*" | "∅";

export type LambdaBand = "low" | "mid" | "high";

export type HaliraStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface AnomalyArtifact {
  readonly kind: "Non" | "Para" | "Retro";
  readonly recordedAfter: Operator | null;
}

export interface Session {
  readonly sequence: readonly Operator[];
  readonly state: DissipationState;
  readonly mode: 1 | 2;
  readonly haliraStep: HaliraStep;
  readonly mode1FailureCount: number;
  readonly anomalyArtifact: AnomalyArtifact | null;
  readonly metaUsedInStep3: boolean;
  readonly orthoUsedInStep6: boolean;
  readonly bound: boolean;
}

export interface KernelResult<T> {
  readonly ok: boolean;
  readonly value: T;
  readonly error: string | null;
}

export function ok<T>(value: T): KernelResult<T> {
  return { ok: true, value, error: null };
}

export function fail<T>(value: T, error: string): KernelResult<T> {
  return { ok: false, value, error };
}

export function createInitialSession(state: DissipationState): Session {
  return {
    sequence: [],
    state,
    mode: 1,
    haliraStep: 0,
    mode1FailureCount: 0,
    anomalyArtifact: null,
    metaUsedInStep3: false,
    orthoUsedInStep6: false,
    bound: false,
  };
}
