import { OPERATORS, type Operator } from "../kernel/index.js";

export function parseOperator(raw: string): Operator {
  const match = OPERATORS.find((op) => op.toLowerCase() === raw.trim().toLowerCase());
  if (!match) {
    throw new Error(`"${raw}" is not one of the 20 operators: ${OPERATORS.join(", ")}`);
  }
  return match;
}

export function parseOperatorSequence(raw: string): Operator[] {
  const separator = raw.includes("∘") ? "∘" : ",";
  return raw
    .split(separator)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map(parseOperator);
}

export function parseDCPair(raw: string): { D: number; C: number } {
  const parts = raw.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`expected "D,C" (two numbers), got "${raw}"`);
  }
  const [D, C] = parts as [number, number];
  return { D, C };
}
