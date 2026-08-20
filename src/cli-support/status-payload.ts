import {
  classifyAttractor,
  lambdaEffective,
  legalNext,
  lyapunov,
  operatorMeaning,
  type AttractorLabel,
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
