import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasManagedMarkers, mergeManaged } from "../render/managed-block.js";
import type { PlannedFile } from "../hosts/HostAdapter.js";
import { isManagedMarkdown } from "../hosts/types.js";

export type FileAction = "created" | "refreshed" | "preserved" | "skipped";

export interface FileWriteResult {
  readonly hostId: string;
  readonly relPath: string;
  readonly displayPath: string;
  readonly absPath: string;
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

/**
 * Writes one planned file, and cannot clobber.
 *
 * A file we have never seen is created; one carrying our markers has only its
 * managed region replaced; one without them is left exactly as it is. That
 * last case is why `lambda init` needs no preview or confirmation step — the
 * destructive outcome a dry-run would protect against does not exist.
 *
 * Files that are not Markdown carry no markers, so they are matched on
 * content instead: identical is `preserved`, different is `refreshed`.
 */
export class FileWriter {
  async write(file: PlannedFile): Promise<FileWriteResult> {
    const existing = await readIfExists(file.absPath);
    const at = (action: FileAction): FileWriteResult => ({
      hostId: file.hostId,
      relPath: file.relPath,
      displayPath: file.displayPath,
      absPath: file.absPath,
      action,
    });

    if (existing === null) {
      await mkdir(path.dirname(file.absPath), { recursive: true });
      await writeFile(file.absPath, file.content, "utf8");
      return at("created");
    }

    // JSON configuration — a plugin manifest, `hooks.json`, `.mcp.json` — has
    // nowhere to carry the managed markers, so it is matched on content
    // instead: identical is `preserved`, different is `refreshed`.
    if (!isManagedMarkdown(file.kind)) {
      if (existing === file.content) return at("preserved");
      await writeFile(file.absPath, file.content, "utf8");
      return at("refreshed");
    }

    if (!hasManagedMarkers(existing)) {
      return at("skipped");
    }

    const { content, changed } = mergeManaged(existing, file.content);
    if (!changed) return at("preserved");

    await writeFile(file.absPath, content, "utf8");
    return at("refreshed");
  }
}
