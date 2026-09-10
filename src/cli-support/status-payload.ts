import {
  attractorProfile,
  classifyAttractor,
  lambdaEffective,
  legalNext,
  lyapunov,
  operatorMeaning,
  type AttractorLabel,
  type AttractorProfile,
  type LambdaBand,
  type Session,
} from "../kernel/index.js";

export function lambdaBand(value: number): LambdaBand {
  if (value < 0.4) return "low";
  if (value <= 0.7) return "mid";
  return "high";
}

export interface StatusPayload {
  readonly state: { readonly D: number; readonly C: number };
  readonly V: number;
  readonly attractor: AttractorLabel;
  /** What that label means, from the formalism — including, for the void, the
   * operators it states as the way out. Carried on the payload so every command
   * built on it (`status`, `sense`, `step`, `halira`) reports the state in
   * words, not only as a glyph. */
  readonly attractorProfile: AttractorProfile;
  readonly lambdaEffective: number;
  readonly lambdaBand: LambdaBand;
  readonly mode: 1 | 2;
  readonly haliraStep: number | null;
  readonly sequenceLength: number;
  readonly bound: boolean;
  readonly mode1FailureCount: number;
  readonly legalNext: readonly { readonly op: string; readonly intent: string }[];
}

export function statusPayload(session: Session): StatusPayload {
  const attractor = classifyAttractor(session.state.D, session.state.C);
  const lambdaEff = lambdaEffective(session.sequence);
  return {
    state: session.state,
    V: lyapunov(session.state.D, session.state.C),
    attractor,
    attractorProfile: attractorProfile(attractor),
    lambdaEffective: lambdaEff,
    lambdaBand: lambdaBand(lambdaEff),
    mode: session.mode,
    haliraStep: session.mode === 2 ? session.haliraStep : null,
    sequenceLength: session.sequence.length,
    bound: session.bound,
    mode1FailureCount: session.mode1FailureCount,
    legalNext: legalNext(session).map((op) => ({ op, intent: operatorMeaning(op) })),
  };
}
