import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasManagedMarkers, mergeManaged } from "./managed-block.js";
import type { PlannedFile } from "./plan.js";

export type FileAction = "created" | "refreshed" | "preserved" | "skipped";

export interface FileWriteResult {
  readonly relPath: string;
  readonly action: FileAction;
}

async function readIfExists(absPath: string): Promise<string | null> {
  try {
    return await readFile(absPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writePlannedFile(projectRoot: string, file: PlannedFile): Promise<FileWriteResult> {
  const absPath = path.resolve(projectRoot, file.relPath);
  const existing = await readIfExists(absPath);

  if (existing === null) {
    await mkdir(path.dirname(absPath), { recursive: true });
    await writeFile(absPath, file.freshHead, "utf8");
    return { relPath: file.relPath, action: "created" };
  }

  if (!hasManagedMarkers(existing)) {
    return { relPath: file.relPath, action: "skipped" };
  }

  const { content, changed } = mergeManaged(existing, file.freshHead);
  if (!changed) {
    return { relPath: file.relPath, action: "preserved" };
  }

  await writeFile(absPath, content, "utf8");
  return { relPath: file.relPath, action: "refreshed" };
}
