/**
 * Operator alphabet — authored λ only (not measured / not quarry λ_effective).
 * Sourced from the ported kernel (src/kernel/formalism.ts), which loads
 * src/assets/formalism.json as the single source of truth for operator
 * class and authored λ. This file is a thin adapter preserving the prior
 * AuthoredOperator/lookupOperator/allOperatorNames public API.
 */

import {
  OPERATORS,
  lambdaIntrinsic,
  operatorClass,
  operatorEffectNote,
  operatorIdempotence,
  operatorIndex,
  operatorMeaning,
  operatorName,
  operatorSymbol,
  type Idempotence,
  type Operator,
  type OperatorClass,
} from "../kernel/index.js";

export type { OperatorClass };

export type AuthoredOperator = {
  readonly name: Operator;
  /** The formalism's full name, e.g. Ana = "Analysis/Abstraction". */
  readonly displayName: string;
  /** 1-based position in the formalism's 20-operator table. */
  readonly index: number;
  readonly className: OperatorClass;
  readonly lambda: number;
  readonly lambdaKind: "authored";
  /** Display-only Unicode glyph from the formalism spec; the name is the identifier. */
  readonly symbol: string;
  /** The move itself, in the formalism's words (e.g. Ana = "Break apart, raise conceptual level"). */
  readonly meaning: string;
  /** What applying the operator does, in the formalism's words. */
  readonly effect: string;
  readonly idempotent: Idempotence;
  /** Stated only where the formalism gives one, i.e. never for `false`. */
  readonly idempotenceRule?: string;
};

export const ALL_OPERATORS: readonly AuthoredOperator[] = OPERATORS.map((name) => {
  const idempotence = operatorIdempotence(name);
  return {
    name,
    displayName: operatorName(name),
    index: operatorIndex(name),
    className: operatorClass(name),
    lambda: lambdaIntrinsic(name),
    lambdaKind: "authored",
    symbol: operatorSymbol(name),
    meaning: operatorMeaning(name),
    effect: operatorEffectNote(name),
    idempotent: idempotence.idempotent,
    ...(idempotence.rule === undefined ? {} : { idempotenceRule: idempotence.rule }),
  };
});

const INDEX = Object.fromEntries(
  ALL_OPERATORS.map((op) => [op.name.toLowerCase(), op]),
) as Readonly<Record<string, AuthoredOperator>>;

export function allOperatorNames(): string[] {
  return ALL_OPERATORS.map((op) => op.name);
}

export function lookupOperator(raw: string): AuthoredOperator | undefined {
  return INDEX[raw.toLowerCase()];
}
