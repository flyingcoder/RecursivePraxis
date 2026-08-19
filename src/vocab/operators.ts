/**
 * CORE Step 3 alphabet — authored λ only (not measured / not quarry λ_effective).
 */

export const OPERATOR_CLASSES = [
  "Constructive",
  "Disruptive",
  "Reflexive",
  "Structural",
] as const;

export type OperatorClass = (typeof OPERATOR_CLASSES)[number];

export type AuthoredOperator = {
  readonly name: string;
  readonly className: OperatorClass;
  readonly lambda: number;
  readonly lambdaKind: "authored";
};

/** Class-grouped table (Variant B layout); order matches CORE.md Step 3. */
export const OPERATORS_BY_CLASS: Readonly<
  Record<OperatorClass, readonly AuthoredOperator[]>
> = {
  Constructive: [
    { name: "Kata", className: "Constructive", lambda: 0.35, lambdaKind: "authored" },
    { name: "Telo", className: "Constructive", lambda: 0.25, lambdaKind: "authored" },
    { name: "Ortho", className: "Constructive", lambda: 0.3, lambdaKind: "authored" },
    { name: "Pro", className: "Constructive", lambda: 0.5, lambdaKind: "authored" },
    { name: "Latch", className: "Constructive", lambda: 0.29, lambdaKind: "authored" },
  ],
  Disruptive: [
    { name: "Ana", className: "Disruptive", lambda: 0.75, lambdaKind: "authored" },
    { name: "Para", className: "Disruptive", lambda: 0.65, lambdaKind: "authored" },
    { name: "Non", className: "Disruptive", lambda: 0.9, lambdaKind: "authored" },
    { name: "Fold", className: "Disruptive", lambda: 0.7, lambdaKind: "authored" },
    { name: "Flux", className: "Disruptive", lambda: 0.6, lambdaKind: "authored" },
  ],
  Reflexive: [
    { name: "Meta", className: "Reflexive", lambda: 0.8, lambdaKind: "authored" },
    { name: "Retro", className: "Reflexive", lambda: 0.4, lambdaKind: "authored" },
    { name: "Echo", className: "Reflexive", lambda: 0.45, lambdaKind: "authored" },
    { name: "Braid", className: "Reflexive", lambda: 0.55, lambdaKind: "authored" },
    { name: "Seed", className: "Reflexive", lambda: 0.28, lambdaKind: "authored" },
  ],
  Structural: [
    { name: "Crux", className: "Structural", lambda: 0.42, lambdaKind: "authored" },
    { name: "Weave", className: "Structural", lambda: 0.33, lambdaKind: "authored" },
    { name: "Bind", className: "Structural", lambda: 0.38, lambdaKind: "authored" },
    { name: "Axis", className: "Structural", lambda: 0.31, lambdaKind: "authored" },
    { name: "Vale", className: "Structural", lambda: 0.88, lambdaKind: "authored" },
  ],
};

export const ALL_OPERATORS: readonly AuthoredOperator[] = OPERATOR_CLASSES.flatMap(
  (c) => OPERATORS_BY_CLASS[c],
);

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
