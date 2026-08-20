export * from "./types.js";

export { lambdaIntrinsic, operatorClass, operatorMeaning, allOperators } from "./formalism.js";
export { commutatorMagnitude, commutatorPairCount } from "./commutator.js";

export {
  lambdaPairwise,
  lambdaEffective,
  totalDissipationCost,
  predictDecay,
  analyzeSequence,
  type PairwiseCost,
  type SequenceAnalysis,
} from "./dissipation.js";

export {
  LYAPUNOV_ALPHA,
  STABILITY_THRESHOLD,
  lyapunov,
  classifyAttractor,
  applyOperator,
  operatorEffect,
  attractorPenalty,
  simulateTrajectory,
  type TrajectoryStep,
} from "./phasePortrait.js";

export {
  MAX_CONSECUTIVE_META,
  trailingRunLength,
  violatesHardConstraint,
  violatesSequenceEndConstraint,
} from "./constraints.js";

export {
  solve,
  distance,
  SOLVER_BETA,
  SOLVER_GAMMA,
  DISTANCE_THRESHOLD,
  MAX_PATH_LENGTH,
  DEFAULT_BEAM_WIDTH,
  type SolveOptions,
  type SolveResult,
} from "./solver.js";

export { HALIRA_STEP_NAMES, haliraCandidateOps } from "./halira.js";

export {
  legalNext,
  step,
  bind,
  haliraStart,
  haliraNext,
  recordMode1Failure,
  MODE2_GATE_THRESHOLD,
} from "./session.js";
