import { readFile } from "node:fs/promises";
import { loadSession, saveSession } from "../cli-support/session-store.js";
import { statusPayload } from "../cli-support/status-payload.js";

function parseUnitInterval(label: string, raw: string): number {
  const value = Number(raw);
  if (Number.isNaN(value) || value < 0 || value > 1) {
    throw new Error(`--${label} must be a number in [0, 1], got "${raw}"`);
  }
  return value;
}

function extractFlags(
  rest: string[],
): { d?: string | undefined; c?: string | undefined; from?: string | undefined } {
  const flags: { d?: string | undefined; c?: string | undefined; from?: string | undefined } = {};
  for (let i = 0; i < rest.length; i += 1) {
    const value = rest[i]!;
    if (value === "--d") flags.d = rest[++i];
    else if (value === "--c") flags.c = rest[++i];
    else if (value === "--from") flags.from = rest[++i];
  }
  return flags;
}

export async function runSense(rest: string[], baseDir: string, json: boolean): Promise<void> {
  const flags = extractFlags(rest);
  let D: number;
  let C: number;

  if (flags.from) {
    const raw = JSON.parse(await readFile(flags.from, "utf8")) as { D: unknown; C: unknown };
    D = parseUnitInterval("d", String(raw.D));
    C = parseUnitInterval("c", String(raw.C));
  } else if (flags.d !== undefined && flags.c !== undefined) {
    D = parseUnitInterval("d", flags.d);
    C = parseUnitInterval("c", flags.c);
  } else {
    console.error("usage: lambda sense --d <n> --c <n> | --from <json>");
    process.exit(1);
  }

  const session = await loadSession(baseDir);
  const next = { ...session, state: { D, C } };
  await saveSession(baseDir, next);

  const payload = statusPayload(next);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`sensed: D=${D.toFixed(3)} C=${C.toFixed(3)} -> attractor ${payload.attractor}`);
  }
  process.exit(0);
}
