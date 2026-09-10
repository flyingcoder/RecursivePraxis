import { z } from "zod";
import { legalNext, OPERATORS, type Operator } from "../kernel/index.js";
import { loadSession } from "../cli-support/session-store.js";

/**
 * PreToolUse enforcement for a `lambda step --op <Operator>` call shelled out
 * by an agent. This is the sequence-grammar gate `src/init/hooks/index.ts`
 * anticipates: it refuses a step the kernel's own `legalNext` (session.ts)
 * would reject, before the shell round-trip happens.
 *
 * It is a UX/latency improvement layered on `step()`'s existing fail-closed
 * check, not a replacement for it — `step()` still rejects an illegal op on
 * its own. Only a `lambda step --op X` invocation is in scope; every other
 * shell command is unexamined and allowed through, and a payload this gate
 * cannot confidently parse fails **open** (allowed) rather than blocking work
 * unrelated to operator sequencing.
 *
 * One body serves three hosts. Claude Code, Codex CLI, and Cursor disagree
 * about where the hook is configured, what the event is called, and how an
 * entry is shaped — all of which is host-adapter business — but they agree on
 * the two things this file depends on: the command arrives as JSON on stdin,
 * and exit code 2 blocks it.
 */
/**
 * The two payload shapes the hosts we install into actually send.
 *
 * Claude Code and Codex CLI both fire `PreToolUse` and put the shell command at
 * `tool_input.command`. Cursor fires `beforeShellExecution`, which carries the
 * command at the root of the payload instead. Accepting both is what lets one
 * gate serve all three — and it matters that this is explicit: a gate that only
 * understood the nested form would parse Cursor's payload cleanly, find no
 * command, and allow every step through, which is failure that looks exactly
 * like success.
 */
const hookPayloadSchema = z.object({
  tool_input: z
    .object({
      command: z.string().optional(),
    })
    .optional(),
  command: z.string().optional(),
});

function extractStepOp(command: string): string | undefined {
  const tokens = command.split(/\s+/);
  if (!tokens.includes("step")) return undefined;
  const opIndex = tokens.indexOf("--op");
  if (opIndex === -1 || opIndex + 1 >= tokens.length) return undefined;
  return tokens[opIndex + 1]!.replace(/^["']|["']$/g, "");
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

export async function runGate(baseDir: string): Promise<void> {
  const raw = await readStdin();

  let command: string | undefined;
  try {
    const payload = hookPayloadSchema.parse(JSON.parse(raw));
    command = payload.tool_input?.command ?? payload.command;
  } catch {
    process.exit(0); // not a payload this gate understands — do not block on it
  }
  if (!command) process.exit(0);

  const opToken = extractStepOp(command);
  if (!opToken) process.exit(0);

  const op = OPERATORS.find((candidate) => candidate.toLowerCase() === opToken.toLowerCase());
  if (!op) process.exit(0); // not one of the 20 names — lambda step's own parser rejects it

  const session = await loadSession(baseDir);

  if (session.bound) {
    console.error("legality-gate: session already bound; no further `lambda step` calls are legal");
    process.exit(2);
  }

  const allowed = legalNext(session);
  if (!allowed.includes(op as Operator)) {
    const haliraNote = session.mode === 2 ? `, HALIRA step ${session.haliraStep}` : "";
    const allowedNote = allowed.length > 0 ? allowed.join(", ") : "(none — call `lambda bind` or escalate to HALIRA)";
    console.error(
      `legality-gate: ${op} is not in legalNext for the current session (mode ${session.mode}${haliraNote}). ` +
        `Legal now: ${allowedNote}.`,
    );
    process.exit(2);
  }

  process.exit(0);
}
