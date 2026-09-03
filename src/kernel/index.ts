export * from "./types.js";

export {
  lambdaIntrinsic,
  operatorClass,
  operatorMeaning,
  operatorSymbol,
  operatorIndex,
  operatorName,
  operatorEffectNote,
  operatorIdempotence,
  allOperators,
  PHASE_PORTRAIT_ALPHA,
  PHASE_PORTRAIT_STABILITY_THRESHOLD,
  formalismAttractorPenalty,
  formalismTransitionOperators,
  type OperatorIdempotence,
} from "./formalism.js";
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
  // Needed by anything that solves the label -> (D, C) inequality rather than
  // hardcoding a band, since ALPHA and the thresholds load from formalism.json
  // and a change there moves the bands underneath the caller.
  VOID_D_THRESHOLD,
  VOID_C_THRESHOLD,
  lyapunov,
  classifyAttractor,
  applyOperator,
  operatorEffect,
  attractorPenalty,
  canTransition,
  analyzeBasinStructure,
  simulateTrajectory,
  suggestTransitionOperators,
  DEFAULT_OPERATOR_EFFECTS,
  type OperatorEffects,
  type TrajectoryStep,
  type BasinStructure,
} from "./phasePortrait.js";

export {
  DERIVE_C_INTERCEPT,
  DERIVE_CONTRADICTION_WEIGHT,
  DERIVE_D_INTERCEPT,
  DERIVE_FAILED_CHECK_WEIGHT,
  DERIVE_UNCERTAINTY_WEIGHT,
  DERIVE_UNRESOLVED_CLAIM_WEIGHT,
  STABLE_TARGET_DISSIPATION,
  deriveInitialDissipation,
  type IntentSignals,
} from "./derive.js";

export {
  ARC_BEAM_WIDTH,
  BAND_MARGIN,
  numbersForLabel,
  operatorsNamedIn,
  planArc,
  verifyArc,
  type ArcPlan,
  type ArcVerification,
  type VerifyArcInput,
} from "./intentArc.js";

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

export {
  degeneracyReport,
  formatDegeneracyReport,
  DEGENERACY_TIGHT_THRESHOLD,
  type DegeneracyReport,
  type OperatorPairDegeneracy,
} from "./degeneracy.js";

export {
  compareTransitionFilter,
  formatTransitionFilterComparison,
  type TransitionFilterComparison,
  type TransitionFilterOptions,
  type TransitionFilterVerdict,
} from "./selectionStudy.js";

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
