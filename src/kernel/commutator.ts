import commutatorData from "../assets/commutator_skeleton.json" with { type: "json" };
import type { Operator } from "./types.js";

type CommutatorEntry = readonly [number, number];

interface CommutatorSkeleton {
  readonly commutator_matrix: Record<Operator, Record<Operator, CommutatorEntry>>;
}

const skeleton = commutatorData as unknown as CommutatorSkeleton;

/**
 * Ported from dissipation_calculator.py `load_commutators_from_skeleton`:
 * sign != 0 -> magnitude 1.0, sign == 0 -> magnitude 0.0. The skeleton's
 * sign is ground truth; extraction-refined magnitudes are out of scope
 * for this engine (see src/assets/NOTICE.md).
 */
export function commutatorMagnitude(opI: Operator, opJ: Operator): number {
  const [sign] = skeleton.commutator_matrix[opI][opJ];
  return sign !== 0 ? 1.0 : 0.0;
}

export function commutatorPairCount(): number {
  const rows = Object.values(skeleton.commutator_matrix);
  return rows.reduce((total, row) => total + Object.keys(row).length, 0);
}
