import { z } from "zod";
import {
  OPERATORS,
  classifyAttractor,
  deriveInitialDissipation,
  numbersForLabel,
  planArc,
  verifyArc,
} from "../kernel/index.js";
import { PromptPolicy } from "../ir/promptPolicy.js";
import type { AttractorLabel } from "../kernel/types.js";

/**
 * The four derive tools, as data.
 *
 * Kept apart from the transport so the handlers can be driven directly in a
 * test — the obligations below are properties of the tools, not of stdio, and
 * a test that had to speak the wire protocol to check them would be testing
 * the SDK instead.
 *
 * Each tool implements steps of `praxis/protaseis/derive-state-from-intent.psuedo` that the
 * document tags [COMPUTED] or [VERIFIED]. None of them implements a
 * [REASONING] step: reading signals out of a transcript, choosing a target
 * attractor and phrasing a diagnosis stay with the caller, where a reviewer
 * can see and argue with them.
 */

const ATTRACTOR_LABELS = ["J=0", "S*", "∅"] as const satisfies readonly AttractorLabel[];
const attractorLabel = z.enum(ATTRACTOR_LABELS);

const dissipationState = z.strictObject({
  D: z.number().min(0).max(1),
  C: z.number().min(0).max(1),
});

/**
 * The load-bearing schema.
 *
 * It accepts signals and it is `strictObject`, so a payload carrying `D` and
 * `C` is rejected rather than quietly ignored. That rejection is the
 * enforcement mechanism for the one rule the derivation path exists to state:
 * a free-text intent must never be read directly into a (D, C) pair. There is
 * deliberately no other route through this server to a derived state.
 */
export const deriveInitialStateInput = z.strictObject({
  uncertainty: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "0..1, how unsure the request sounds. The only free scalar here, and the field to be most suspicious of — prefer moving weight onto the countable fields below.",
    ),
  failedChecks: z
    .array(z.string())
    .describe("Things that demonstrably failed. Name each one so a reviewer can challenge it."),
  unresolvedClaims: z
    .array(z.string())
    .describe("Assertions nothing has settled yet. Name each one so a reviewer can challenge it."),
  contradictionDetected: z
    .boolean()
    .describe("Whether two stated requirements are mutually exclusive."),
});

export const planArcInput = z.strictObject({
  initial: dissipationState.describe("The derived initial state, from derive_initial_state."),
  targetLabel: attractorLabel
    .optional()
    .describe(
      "Where the intent should land. Omit when the intent does not say, and the engine's standing stable target is used. This is the caller's one irreducible judgment — a choice among three values, not a continuum.",
    ),
});

export const numbersForLabelInput = z.strictObject({
  label: attractorLabel.describe("The attractor whose representative point is wanted."),
});

export const verifyArcInput = z.strictObject({
  initial: dissipationState,
  target: dissipationState,
  initialLabel: attractorLabel
    .optional()
    .describe("Claimed label for the initial state. Rejected if the kernel disagrees."),
  targetLabel: attractorLabel
    .optional()
    .describe("Claimed label for the target state. Rejected if the kernel disagrees."),
  diagnosis: z
    .string()
    .optional()
    .describe("Authored diagnosis text, cross-checked against the solved sequence."),
});

export interface ToolDefinition {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: z.ZodType;
  readonly handler: (args: never) => unknown;
}

function defineTool<S extends z.ZodType>(
  name: string,
  title: string,
  description: string,
  inputSchema: S,
  handler: (args: z.infer<S>) => unknown,
): ToolDefinition {
  return { name, title, description, inputSchema, handler: handler as (args: never) => unknown };
}

export const DERIVE_TOOLS: readonly ToolDefinition[] = [
  defineTool(
    "derive_initial_state",
    "Derive initial state from signals",
    "Turn observable signals read out of an intent into an initial (D, C) dissipation state and its attractor label. Pass signals, never numbers: reading an intent straight into a (D, C) pair invents a measurement the reading cannot support. The formula is fixed and its constants are authored, not measured.",
    deriveInitialStateInput,
    (args) => {
      const state = deriveInitialDissipation(args);
      return {
        initial: state,
        initialLabel: classifyAttractor(state.D, state.C),
        signalsRead: {
          uncertainty: args.uncertainty,
          failedChecks: args.failedChecks.length,
          unresolvedClaims: args.unresolvedClaims.length,
          contradictionDetected: args.contradictionDetected,
        },
      };
    },
  ),

  defineTool(
    "plan_arc",
    "Plan the arc to a target attractor",
    "Resolve the target state and ask the formalism which operators map this transition. Returns findings rather than errors: `sameLabel` means the state the intent describes is already the state it asked for, and `towardCostlierAttractor` means the arc runs toward collapse. Neither is a reason to re-roll the target — doing that fabricates a problem to have one to solve.",
    planArcInput,
    (args) => planArc(args.initial, args.targetLabel),
  ),

  defineTool(
    "numbers_for_label",
    "Representative point for an attractor",
    "The (D, C) point this server uses to stand for an attractor label. Bands are solved from the kernel's own constants rather than hardcoded, so a change to formalism.json moves them, and each point is held clear of its threshold by a margin because a point on a threshold classifies by float comparison.",
    numbersForLabelInput,
    (args) => {
      const state = numbersForLabel(args.label);
      return { label: args.label, state, classifiesAs: classifyAttractor(state.D, state.C) };
    },
  ),

  defineTool(
    "verify_arc",
    "Verify a derived arc against the kernel",
    "Check the label claims and run the real beam search. A claimed label the kernel disagrees with is rejected. Read `alreadyWithinRadius` before reporting success: the solver returns an empty sequence with success=true when the initial state is already inside the success radius, and announcing SUCCESS there claims a solved plan when the truth is 'nothing to do'. `unusedDiagnosisOperators` is a flag only — never rewrite a diagnosis from it, since a diagnosis may correctly name the cause rather than the cure.",
    verifyArcInput,
    (args) => verifyArc(args),
  ),
];

/**
 * The meta-prompting tool, kept in its own array.
 *
 * `DERIVE_TOOLS` is asserted by name in `tests/mcp/tools.test.ts` as the exact
 * set of tools implementing `praxis/protaseis/derive-state-from-intent.psuedo`. This composes a
 * different document (`praxis/protaseis/operator-chain-as-prompt-policy.psuedo`) and does not
 * belong to that set, so it registers alongside rather than inside it.
 */
export const META_PROMPT_TOOLS: readonly ToolDefinition[] = [
  defineTool(
    "compose_prompt_policy",
    "Compose an operator chain into a prompt policy",
    "Read an operator chain as a set of properties the finished prompt exhibits simultaneously, not as a sequence of steps to run in order, and render one composed brief for the given intent. `∘` is composition: `Axis ∘ Ana` means 'analytical, within a fixed frame', not 'frame, then analyse'. Every clause in the returned brief traces to a named operator field, so do not re-expand the result into a section per operator — `verification.perOperatorHeadings` reports it if you have. The chain is rejected, not repaired, if it violates the sequence grammar.",
    z.strictObject({
      intent: z.string().min(1).describe("The task in the user's own words, e.g. 'Research about torsion field'."),
      chain: z
        .array(z.enum(OPERATORS))
        .min(1)
        .describe("Operators in composition order, e.g. ['Axis','Ana','Pro','Para','Kata','Latch']. The last one sets how the brief terminates."),
    }),
    (args) => {
      const policy = PromptPolicy.compose(args.chain);
      const brief = policy.render(args.intent);
      return {
        brief,
        chain: policy.chain,
        netEffect: policy.netEffect,
        netContractive: policy.netContractive,
        lambdaEffective: policy.lambdaEffective,
        seams: policy.seams,
        requiredArtifacts: policy.requiredArtifacts(),
        properties: policy.properties.map((p) => ({
          op: p.op,
          symbol: p.symbol,
          adjective: p.adjective,
          license: p.license,
          lifetime: p.lifetime,
          mayCommit: p.mayCommit,
          exitTest: p.exitTest,
          budget: p.budget,
        })),
        verification: policy.verify(brief),
      };
    },
  ),
];
