import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInitialSession, type Session } from "../kernel/index.js";

const SESSION_FILE = "session.json";

export function sessionFilePath(baseDir: string): string {
  return path.join(baseDir, SESSION_FILE);
}

export async function loadSession(baseDir: string): Promise<Session> {
  try {
    const text = await readFile(sessionFilePath(baseDir), "utf8");
    return JSON.parse(text) as Session;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createInitialSession({ D: 0, C: 0 });
    }
    throw error;
  }
}

export async function saveSession(baseDir: string, session: Session): Promise<void> {
  await mkdir(baseDir, { recursive: true });
  const target = sessionFilePath(baseDir);
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(session, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, target);
}
