import formalismData from "../assets/formalism.json" with { type: "json" };
import type { Operator, OperatorClass } from "./types.js";
import { OPERATORS } from "./types.js";

interface FormalismOperatorEntry {
  readonly index: number;
  readonly class: OperatorClass;
  readonly lambda_intrinsic: number;
  readonly meaning: string;
}

interface FormalismDissipationRules {
  readonly pairwise_interaction_coefficient: number;
  readonly max_interaction_magnitude: number;
}

interface FormalismDocument {
  readonly operators: Record<Operator, FormalismOperatorEntry>;
  readonly dissipation_rules: FormalismDissipationRules;
}

const formalism = formalismData as unknown as FormalismDocument;

export const DISSIPATION_PAIRWISE_COEFFICIENT =
  formalism.dissipation_rules.pairwise_interaction_coefficient;
export const DISSIPATION_MAX_INTERACTION =
  formalism.dissipation_rules.max_interaction_magnitude;

export function lambdaIntrinsic(op: Operator): number {
  return formalism.operators[op].lambda_intrinsic;
}

export function operatorClass(op: Operator): OperatorClass {
  return formalism.operators[op].class;
}

export function operatorMeaning(op: Operator): string {
  return formalism.operators[op].meaning;
}

export function allOperators(): readonly Operator[] {
  return OPERATORS;
}
