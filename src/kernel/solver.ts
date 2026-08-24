import type { AttractorLabel, DissipationState, Operator } from "./types.js";
import { OPERATORS } from "./types.js";
import { totalDissipationCost } from "./dissipation.js";
import {
  DEFAULT_OPERATOR_EFFECTS,
  applyOperator,
  attractorPenalty,
  classifyAttractor,
  type OperatorEffects,
} from "./phasePortrait.js";
import { violatesHardConstraint } from "./constraints.js";

export const SOLVER_BETA = 0.7;
export const SOLVER_GAMMA = 1.1;
export const DISTANCE_THRESHOLD = 0.12;
export const MAX_PATH_LENGTH = 14;
export const DEFAULT_BEAM_WIDTH = 5;
const MAX_ITERATIONS = 1000;

interface SearchNode {
  readonly state: DissipationState;
  readonly sequence: readonly Operator[];
  /** The A* ranking key `g + h` — see `accumulatedCost` / `heuristic`. */
  readonly estimatedTotalCost: number;
}

export interface SolveOptions {
  readonly initial: DissipationState;
  readonly target: DissipationState;
  readonly beamWidth?: number;
  /**
   * An alternative per-operator displacement table. Defaults to
   * `DEFAULT_OPERATOR_EFFECTS`, whose values are class-generated rather than
   * measured — see the provenance note in `phasePortrait.ts`. This is the seam
   * that makes evaluating a replacement table an experiment rather than an
   * edit to the kernel. It covers the search only: `session.ts` `step` still
   * advances state with the default table, so a sequence solved here under an
   * injected table will not be stepped under it.
   */
  readonly effects?: OperatorEffects;
}

export interface SolveResult {
  readonly sequence: readonly Operator[];
  readonly finalState: DissipationState;
  readonly cost: number;
  readonly costBreakdown: {
    readonly terminalDistance: number;
    readonly dissipationCost: number;
    readonly attractorPenalty: number;
    readonly total: number;
  };
  readonly success: boolean;
  readonly length: number;
}

export function distance(a: DissipationState, b: DissipationState): number {
  return Math.sqrt((a.D - b.D) ** 2 + (a.C - b.C) ** 2);
}

/**
 * Ported from inverse_solver.py `violates_constraints`: the shared hard
 * constraints plus the solver-local heuristic that avoids proposing Ana
 * when the path is one step from max_path_length (since Ana can never be
 * the last operator of a committed sequence).
 */
function violatesSolverConstraint(sequence: readonly Operator[], next: Operator): boolean {
  if (violatesHardConstraint(sequence, next)) return true;
  if (next === "Ana" && sequence.length >= MAX_PATH_LENGTH - 1) return true;
  return false;
}

function attractorLabelFor(state: DissipationState): AttractorLabel {
  return classifyAttractor(state.D, state.C);
}

/**
 * The A* ranking key and the reported objective are deliberately different
 * functions, and the seam between them is the point of this module.
 *
 * J — the reported objective — is
 * `distance + SOLVER_BETA * dissipation + SOLVER_GAMMA * penalty`. It is what
 * `formatSolution` returns as `cost` / `costBreakdown.total`, and what the
 * Python parity test pins.
 *
 * `accumulatedCost` is A*'s `g`: the part of J already *paid* along the path —
 * dissipation and the attractor penalty. It deliberately omits terminal
 * distance, because distance is the estimate-to-go `h`, not a sunk cost.
 * Ranking the frontier by `g + h` therefore counts distance exactly once.
 * Ranking by `J + h`, as this module previously did, counted it twice and so
 * discarded solutions that J itself scored better — see
 * docs/plans/algebra-vs-dynamics-build-plan.md §0.3 for the measured effect.
 *
 * Dissipation is a whole-path total (`totalDissipationCost` sums n-1
 * transitions), so recomputing `g` per node is correct; no incremental
 * accumulator is needed.
 *
 * For a node evaluated at its own state the two coincide numerically
 * (`J = g + h` there), so the node carries only the ranking key and
 * `formatSolution` re-derives J from its parts.
 */
function accumulatedCost(
  sequence: readonly Operator[],
  state: DissipationState,
): number {
  const dissipationCost = sequence.length >= 2 ? totalDissipationCost(sequence) : 0;
  const penalty = attractorPenalty(attractorLabelFor(state));
  return SOLVER_BETA * dissipationCost + SOLVER_GAMMA * penalty;
}

function heuristic(state: DissipationState, target: DissipationState): number {
  return distance(state, target);
}

function formatSolution(node: SearchNode, target: DissipationState, success: boolean): SolveResult {
  const terminalDistance = distance(node.state, target);
  const dissipationCost = node.sequence.length >= 2 ? totalDissipationCost(node.sequence) : 0;
  const penalty = attractorPenalty(attractorLabelFor(node.state));
  const total = terminalDistance + SOLVER_BETA * dissipationCost + SOLVER_GAMMA * penalty;

  return {
    sequence: node.sequence,
    finalState: node.state,
    cost: total,
    costBreakdown: {
      terminalDistance,
      dissipationCost,
      attractorPenalty: penalty,
      total,
    },
    success,
    length: node.sequence.length,
  };
}

export function solve(options: SolveOptions): SolveResult {
  const { initial, target } = options;
  const beamWidth = options.beamWidth ?? DEFAULT_BEAM_WIDTH;
  const effects = options.effects ?? DEFAULT_OPERATOR_EFFECTS;

  const startNode: SearchNode = {
    state: initial,
    sequence: [],
    estimatedTotalCost: accumulatedCost([], initial) + heuristic(initial, target),
  };

  let frontier: SearchNode[] = [startNode];
  let bestNode = startNode;
  let bestDistance = distance(initial, target);

  let iterations = 0;
  while (frontier.length > 0 && iterations < MAX_ITERATIONS) {
    iterations += 1;

    const currentBeam = [...frontier]
      .sort((a, b) => a.estimatedTotalCost - b.estimatedTotalCost)
      .slice(0, beamWidth);
    frontier = [];

    for (const node of currentBeam) {
      const dist = distance(node.state, target);

      if (dist < bestDistance) {
        bestDistance = dist;
        bestNode = node;
      }

      if (dist <= DISTANCE_THRESHOLD) {
        return formatSolution(node, target, true);
      }

      if (node.sequence.length >= MAX_PATH_LENGTH) {
        continue;
      }

      for (const op of OPERATORS) {
        if (violatesSolverConstraint(node.sequence, op)) continue;

        const newState = applyOperator(node.state, op, effects);
        const newSequence = [...node.sequence, op];
        const g = accumulatedCost(newSequence, newState);
        const h = heuristic(newState, target);

        frontier.push({
          state: newState,
          sequence: newSequence,
          estimatedTotalCost: g + h,
        });
      }
    }
  }

  return formatSolution(bestNode, target, false);
}
