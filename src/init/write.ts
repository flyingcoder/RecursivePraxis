import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasManagedMarkers, mergeManaged } from "../render/managed-block.js";
import { applyFragment } from "./json-fragment.js";
import type { PlannedFile } from "../hosts/HostAdapter.js";
import { isManagedMarkdown } from "../hosts/types.js";

export type FileAction = "created" | "refreshed" | "preserved" | "skipped" | "unreadable";

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

    // A shared config file. We may set exactly one key and must leave every
    // other byte of the document intact — it holds the user's own MCP servers
    // and unrelated settings, and they did not ask us to rewrite those.
    if (file.fragment !== undefined) {
      const outcome = applyFragment(existing, file.fragment);

      // A file we cannot parse is a file we do not understand, and writing one
      // we do not understand is exactly the destructive outcome this whole
      // module is arranged to make impossible. Report and leave it untouched.
      if (outcome.kind === "unparseable") return at("unreadable");
      if (outcome.kind === "unchanged") return at("preserved");

      await mkdir(path.dirname(file.absPath), { recursive: true });
      await writeFile(file.absPath, outcome.text, "utf8");
      return at(existing === null ? "created" : "refreshed");
    }

    if (existing === null) {
      await mkdir(path.dirname(file.absPath), { recursive: true });
      await writeFile(file.absPath, file.content, "utf8");
      return at("created");
    }

    // JSON configuration we own outright — a plugin manifest, `hooks.json`, the
    // plugin's own `.mcp.json` — has nowhere to carry the managed markers, so it
    // is matched on content instead: identical is `preserved`, different is
    // `refreshed`. Safe only because nothing else writes these files.
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
