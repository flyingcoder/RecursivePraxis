import { readFile } from "node:fs/promises";
import { OPERATORS, type Operator } from "../kernel/index.js";
import { parseOperatorSequence } from "../cli-support/parse.js";
import { PromptPolicy, type ComposeOptions } from "../ir/promptPolicy.js";
import type { AdjectiveOverride } from "../vocab/prompt-policy.js";

function extractAdjectivesFlag(rest: string[]): { adjectives?: string; rest: string[] } {
  const remaining: string[] = [];
  let adjectives: string | undefined;
  for (let i = 0; i < rest.length; i += 1) {
    const value = rest[i]!;
    if (value === "--adjectives") {
      adjectives = rest[++i];
      continue;
    }
    remaining.push(value);
  }
  return adjectives === undefined ? { rest: remaining } : { adjectives, rest: remaining };
}

/**
 * The no-MCP route to the same seam, shaped like `compile --bindings`: a JSON
 * file of model-authored values, read rather than invented by the CLI.
 *
 * Validated here only far enough to know it is the right shape — what makes an
 * adjective acceptable is `PromptVocabulary.resolveAdjective`'s to say, and
 * duplicating those rules in the loader is how the two drift apart.
 */
async function loadAdjectives(
  filePath: string,
): Promise<Readonly<Partial<Record<Operator, AdjectiveOverride>>>> {
  const raw: unknown = JSON.parse(await readFile(filePath, "utf8"));
  if (!Array.isArray(raw)) {
    throw new Error(
      `--adjectives must be a JSON array of { "op", "adjective", "reason" }, got ${raw === null ? "null" : typeof raw}`,
    );
  }

  const overrides: Partial<Record<Operator, AdjectiveOverride>> = {};
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) {
      throw new Error('--adjectives entries must be objects: { "op", "adjective", "reason" }');
    }
    const { op, adjective, reason } = entry as Record<string, unknown>;
    if (typeof op !== "string" || !(OPERATORS as readonly string[]).includes(op)) {
      throw new Error(`--adjectives names "${String(op)}", which is not one of the 20 operators`);
    }
    if (typeof adjective !== "string" || typeof reason !== "string") {
      throw new Error(`--adjectives entry for ${op} needs a string "adjective" and a string "reason"`);
    }
    if (overrides[op as Operator] !== undefined) {
      throw new Error(`--adjectives gives two overrides for ${op}; give at most one`);
    }
    overrides[op as Operator] = { adjective, reason };
  }
  return overrides;
}

export async function runMetaPrompt(rest: string[], json: boolean): Promise<void> {
  const { adjectives: adjectivesPath, rest: args } = extractAdjectivesFlag(rest);
  if (args.length !== 2) {
    console.error(
      'usage: lambda meta-prompt "<intent>" "Axis,Ana,Pro,Para,Kata,Latch" [--adjectives <file>] [--json]',
    );
    process.exit(1);
  }

  const intent = args[0]!;
  let policy: PromptPolicy;
  try {
    const chain: readonly Operator[] = parseOperatorSequence(args[1]!);
    const options: ComposeOptions = adjectivesPath
      ? { adjectives: await loadAdjectives(adjectivesPath) }
      : {};
    policy = PromptPolicy.compose(chain, options);
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
            adjectiveSource: p.adjectiveSource,
            ...(p.adjectiveReason === undefined ? {} : { adjectiveReason: p.adjectiveReason }),
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
