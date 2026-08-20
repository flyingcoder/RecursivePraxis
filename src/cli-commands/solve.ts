import { solve } from "../kernel/index.js";
import { parseDCPair } from "../cli-support/parse.js";

function extractFlags(
  rest: string[],
): { initial?: string | undefined; target?: string | undefined; beamWidth?: string | undefined } {
  const flags: {
    initial?: string | undefined;
    target?: string | undefined;
    beamWidth?: string | undefined;
  } = {};
  for (let i = 0; i < rest.length; i += 1) {
    const value = rest[i]!;
    if (value === "--initial") flags.initial = rest[++i];
    else if (value === "--target") flags.target = rest[++i];
    else if (value === "--beam-width") flags.beamWidth = rest[++i];
  }
  return flags;
}

export function runSolve(rest: string[], json: boolean): void {
  const flags = extractFlags(rest);
  if (!flags.initial || !flags.target) {
    console.error("usage: lambda solve --initial D,C --target D,C [--beam-width N]");
    process.exit(1);
  }

  let initial: { D: number; C: number };
  let target: { D: number; C: number };
  try {
    initial = parseDCPair(flags.initial);
    target = parseDCPair(flags.target);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }

  const beamWidth = flags.beamWidth ? Number(flags.beamWidth) : undefined;
  const result = solve({ initial, target, ...(beamWidth !== undefined ? { beamWidth } : {}) });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  console.log(result.success ? "SUCCESS" : "PARTIAL (threshold not reached within max_path_length)");
  console.log(`sequence: ${result.sequence.join(" ∘ ") || "(empty)"}`);
  console.log(`final state: D=${result.finalState.D.toFixed(3)} C=${result.finalState.C.toFixed(3)}`);
  console.log(`cost: ${result.cost.toFixed(4)}`);
  process.exit(0);
}
