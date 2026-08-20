import type { AttractorLabel, DissipationState, Operator } from "./types.js";
import { OPERATORS } from "./types.js";
import { totalDissipationCost } from "./dissipation.js";
import {
  applyOperator,
  attractorPenalty,
  classifyAttractor,
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
  readonly costSoFar: number;
  readonly estimatedTotalCost: number;
}

export interface SolveOptions {
  readonly initial: DissipationState;
  readonly target: DissipationState;
  readonly beamWidth?: number;
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

function computeCost(
  sequence: readonly Operator[],
  finalState: DissipationState,
  target: DissipationState,
): number {
  const terminalDistance = distance(finalState, target);
  const dissipationCost = sequence.length >= 2 ? totalDissipationCost(sequence) : 0;
  const penalty = attractorPenalty(attractorLabelFor(finalState));
  return terminalDistance + SOLVER_BETA * dissipationCost + SOLVER_GAMMA * penalty;
}

function heuristic(state: DissipationState, target: DissipationState): number {
  return distance(state, target);
}

function formatSolution(node: SearchNode, target: DissipationState, success: boolean): SolveResult {
  const terminalDistance = distance(node.state, target);
  const dissipationCost = node.sequence.length >= 2 ? totalDissipationCost(node.sequence) : 0;
  const penalty = attractorPenalty(attractorLabelFor(node.state));

  return {
    sequence: node.sequence,
    finalState: node.state,
    cost: node.costSoFar,
    costBreakdown: {
      terminalDistance,
      dissipationCost,
      attractorPenalty: penalty,
      total: node.costSoFar,
    },
    success,
    length: node.sequence.length,
  };
}

export function solve(options: SolveOptions): SolveResult {
  const { initial, target } = options;
  const beamWidth = options.beamWidth ?? DEFAULT_BEAM_WIDTH;

  const startNode: SearchNode = {
    state: initial,
    sequence: [],
    costSoFar: 0,
    estimatedTotalCost: heuristic(initial, target),
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

        const newState = applyOperator(node.state, op);
        const newSequence = [...node.sequence, op];
        const costSoFar = computeCost(newSequence, newState, target);
        const h = heuristic(newState, target);

        frontier.push({
          state: newState,
          sequence: newSequence,
          costSoFar,
          estimatedTotalCost: costSoFar + h,
        });
      }
    }
  }

  return formatSolution(bestNode, target, false);
}
