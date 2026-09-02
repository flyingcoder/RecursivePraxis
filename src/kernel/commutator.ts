import commutatorData from "../assets/commutator_skeleton.json" with { type: "json" };
import type { Operator } from "./types.js";

/** The vendored skeleton is `v2.1.0`: `[sign, resultant_index, magnitude]`.
 * `sign`/`resultant` are architecturally-fixed; `magnitude` is the
 * extraction-derived interaction strength for that pair. */
type CommutatorEntry = readonly [number, number, number];

interface CommutatorSkeleton {
  readonly commutator_matrix: Record<Operator, Record<Operator, CommutatorEntry>>;
}

const skeleton = commutatorData as unknown as CommutatorSkeleton;

/**
 * `|η_ij|` for the pair, read directly from the skeleton's extraction
 * magnitude. `dissipation_rules.formula` names this quantity `|η_{ij}|`; this
 * is a literal read of it.
 *
 * Earlier this collapsed to a binary `sign != 0 -> 1.0 : 0.0`, discarding the
 * magnitude entirely (see the retired framing in `src/assets/NOTICE.md`
 * item 5). For 384 of 400 pairs the two are numerically identical — magnitude
 * already equals that binary mapping — so this change alters only the 16
 * pairs where extraction evidence disagrees with the architectural sign
 * (`evidence_based_pairs` in the skeleton's own metadata). Trusting the
 * magnitude there means: for a nonzero-sign pair, the *measured* interaction
 * strength can be less than the maximal 1.0 the sign alone implied; for a
 * zero-sign (architecturally "commuting") pair, a nonzero measured magnitude
 * means the extraction evidence found an interaction the architecture didn't
 * predict. Both are more informative than discarding the number.
 */
export function commutatorMagnitude(opI: Operator, opJ: Operator): number {
  const [, , magnitude] = skeleton.commutator_matrix[opI][opJ];
  return magnitude;
}

export function commutatorPairCount(): number {
  const rows = Object.values(skeleton.commutator_matrix);
  return rows.reduce((total, row) => total + Object.keys(row).length, 0);
}
