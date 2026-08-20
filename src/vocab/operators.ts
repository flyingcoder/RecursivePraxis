/**
 * CORE Step 3 alphabet — authored λ only (not measured / not quarry λ_effective).
 * Sourced from the ported kernel (src/kernel/formalism.ts), which loads
 * src/assets/formalism.json as the single source of truth for operator
 * class and authored λ. This file is a thin adapter preserving the prior
 * AuthoredOperator/lookupOperator/allOperatorNames public API.
 */

import {
  OPERATORS,
  lambdaIntrinsic,
  operatorClass,
  type Operator,
  type OperatorClass,
} from "../kernel/index.js";

export type { OperatorClass };

export type AuthoredOperator = {
  readonly name: Operator;
  readonly className: OperatorClass;
  readonly lambda: number;
  readonly lambdaKind: "authored";
};

export const ALL_OPERATORS: readonly AuthoredOperator[] = OPERATORS.map((name) => ({
  name,
  className: operatorClass(name),
  lambda: lambdaIntrinsic(name),
  lambdaKind: "authored",
}));

const INDEX = Object.fromEntries(
  ALL_OPERATORS.map((op) => [op.name.toLowerCase(), op]),
) as Readonly<Record<string, AuthoredOperator>>;

export function allOperatorNames(): string[] {
  return ALL_OPERATORS.map((op) => op.name);
}

export function lookupOperator(raw: string): AuthoredOperator | undefined {
  return INDEX[raw.toLowerCase()];
}

export function formatAuthoredLambda(op: AuthoredOperator): string {
  return `λ=${op.lambda} (authored)`;
}
