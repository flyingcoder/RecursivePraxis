import type { AttractorLabel, LambdaBand, Operator, Session } from "../kernel/index.js";
import { classifyAttractor, lambdaEffective, legalNext, operatorMeaning } from "../kernel/index.js";
import { HALIRA_STEP_NAMES } from "../kernel/index.js";

export interface IRLegalOp {
  readonly op: Operator;
  readonly intent: string;
}

export interface IRPayload {
  readonly attractor: AttractorLabel;
  readonly mode: 1 | 2;
  readonly haliraStep: number | null;
  readonly haliraStepName: string | null;
  readonly legalNext: readonly IRLegalOp[];
  readonly lambdaBand: LambdaBand;
  readonly constraint: "do not invent operators outside legalNext";
}

/** Authored presentation thresholds for an authored λ value. */
export function lambdaBandFor(value: number): LambdaBand {
  if (value < 0.4) return "low";
  if (value <= 0.7) return "mid";
  return "high";
}

export function compileIR(session: Session): IRPayload {
  const attractor = classifyAttractor(session.state.D, session.state.C);
  const band = lambdaBandFor(lambdaEffective(session.sequence));
  const haliraStepName =
    session.mode === 2 && session.haliraStep > 0
      ? HALIRA_STEP_NAMES[session.haliraStep as 1 | 2 | 3 | 4 | 5 | 6 | 7]
      : null;

  return {
    attractor,
    mode: session.mode,
    haliraStep: session.mode === 2 ? session.haliraStep : null,
    haliraStepName,
    legalNext: legalNext(session).map((op) => ({ op, intent: operatorMeaning(op) })),
    lambdaBand: band,
    constraint: "do not invent operators outside legalNext",
  };
}

export function renderIRMarkdown(ir: IRPayload): string {
  const lines: string[] = [];
  lines.push(`# Instruction surface (this turn)`);
  lines.push("");
  lines.push(`- attractor: **${ir.attractor}**`);
  lines.push(`- mode: ${ir.mode}${ir.haliraStep ? ` (HALIRA step ${ir.haliraStep} — ${ir.haliraStepName})` : ""}`);
  lines.push(`- lambda band: ${ir.lambdaBand}`);
  lines.push("");
  lines.push(`## legalNext`);
  if (ir.legalNext.length === 0) {
    lines.push("- (none — nothing left to step; only \`bind\` may finalize)");
  } else {
    for (const { op, intent } of ir.legalNext) {
      lines.push(`- **${op}** — ${intent}`);
    }
  }
  lines.push("");
  lines.push(`> Hard rule: do not invent operators outside legalNext. Never self-label state.`);
  return lines.join("\n");
}
