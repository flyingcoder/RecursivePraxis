import type { Operator } from "../kernel/index.js";
import { parseOperatorSequence } from "../cli-support/parse.js";
import { PromptPolicy } from "../ir/promptPolicy.js";

export function runMetaPrompt(rest: string[], json: boolean): void {
  if (rest.length !== 2) {
    console.error('usage: lambda meta-prompt "<intent>" "Axis,Ana,Pro,Para,Kata,Latch" [--json]');
    process.exit(1);
  }

  const intent = rest[0]!;
  let policy: PromptPolicy;
  try {
    const chain: readonly Operator[] = parseOperatorSequence(rest[1]!);
    policy = PromptPolicy.compose(chain);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }

  const brief = policy.render(intent);

  if (json) {
    console.log(
      JSON.stringify(
        {
          intent,
          chain: policy.chain,
          brief,
          netEffect: policy.netEffect,
          netContractive: policy.netContractive,
          lambdaEffective: policy.lambdaEffective,
          seams: policy.seams,
          requiredArtifacts: policy.requiredArtifacts(),
          properties: policy.properties.map((p) => ({
            op: p.op,
            symbol: p.symbol,
            displayName: p.displayName,
            index: p.index,
            adjective: p.adjective,
            license: p.license,
            lifetime: p.lifetime,
            move: p.move,
            capabilities: p.capabilities,
            mayCommit: p.mayCommit,
            exitTest: p.exitTest,
            budget: p.budget,
            effectVector: p.effectVector,
          })),
          verification: policy.verify(brief),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(brief);
}
