import { z } from "zod";
import { loadSession } from "../cli-support/session-store.js";
import { SessionBriefing } from "../cli-support/session-briefing.js";
import { Settings } from "../config/settings.js";

/**
 * The context-injection hook body: on every turn, the host hands this the
 * prompt payload on stdin and prepends whatever it prints to the model's
 * context.
 *
 * This is the mechanism `THE_IDEA.md` calls the Lambda Engine — state
 * transition made visible to the agent on every turn, rather than a rule the
 * agent is trusted to remember. The original `.cursor` implementation
 * approximated it with `alwaysApply: true` prose files carrying a static
 * operator table; this carries the live kernel session instead, so what the
 * agent is told is what `legalNext` will actually permit.
 *
 * It is the opposite posture from `gate.ts`: this never blocks. `continue` is
 * always `true` and the exit code is always 0, because a hook that can refuse
 * a *prompt* would fail the user's whole turn, not just one illegal operator.
 * Anything it cannot do — an unparseable payload, an unreadable config — it
 * does silently rather than noisily, for the same reason.
 */

/**
 * The payload is not read for content — unlike `gate.ts`, this command needs
 * no field out of it. Parsing is only how we confirm a host invoked us with a
 * real event rather than a human running `lambda inject` at a shell, where
 * printing a hook envelope to a terminal would be noise.
 */
const hookPayloadSchema = z.object({}).loose();

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

export async function runInject(baseDir: string): Promise<void> {
  const raw = await readStdin();

  try {
    hookPayloadSchema.parse(JSON.parse(raw));
  } catch {
    process.exit(0); // not a payload this hook understands — inject nothing
  }

  let enabled = true;
  let briefing: string;
  try {
    const settings = await Settings.load({ cwd: process.cwd(), baseDir });
    enabled = settings.contextInjectionEnabled();
    briefing = SessionBriefing.text(await loadSession(baseDir));
  } catch {
    process.exit(0); // an unreadable session or config must not break the turn
  }

  if (!enabled) process.exit(0);

  console.log(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: briefing,
      },
    }),
  );
  process.exit(0);
}
