import { z } from "zod";
import {
  OPERATORS,
  classifyAttractor,
  deriveInitialDissipation,
  numbersForLabel,
  planArc,
  verifyArc,
} from "../kernel/index.js";
import { ChainReading } from "../ir/chainReading.js";
import type { AttractorLabel, Operator } from "../kernel/types.js";

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
 * The chain-reading tool, kept in its own array: `DERIVE_TOOLS` is the named
 * set implementing one pseudocode document, and this implements none of
 * them. It reads `formalism.json`'s `algebra_relations`
 * — the block that until now nothing read at all.
 *
 * It answers a different question from `analyze`. That one prices a sequence
 * (λ, trajectory, half-life); this one reports what the formalism *says about
 * the operators in it*, which is the part a model has otherwise been guessing.
 */
export const ALGEBRA_TOOLS: readonly ToolDefinition[] = [
  defineTool(
    "read_chain_algebra",
    "Read a chain against the formalism's algebra",
    "Report what the formalism states about the operators in a chain: which adjacent pairs it relates (absorption laws, triple relations, commutator exceptions), where the vendored commutator skeleton's measured magnitude agrees or disagrees with those statements, which operator classes are in play and what each class does, which operators are projections onto an attractor, and every sequence-grammar rule the chain breaks. Read the result as description, never as a rewrite: these are function-space statements and this engine composes displacements, so `Ortho ∘ Ana = Kata` is not permission to replace that pair with Kata, drop a repeat, or reorder anything. The `caveat` field says the same thing and is worth quoting if you pass the reading on. Unlike compileExecutionProgram this neither rejects nor repairs a chain — a chain that breaks the grammar is read and its violations reported.",
    z.strictObject({
      chain: z
        .array(z.enum(OPERATORS))
        .min(1)
        .describe("Operators in chain order, e.g. ['Meta','Ortho','Kata']. Order matters: composition statements are matched as written."),
    }),
    (args) => ChainReading.read(args.chain).summary(),
  ),
];
