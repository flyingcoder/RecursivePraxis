import { readFile, rm, rmdir } from "node:fs/promises";
import path from "node:path";
import { InstallManifest, contentHash } from "../manifest/InstallManifest.js";
import { inspectInstall } from "../manifest/inspect.js";
import { HostRegistry } from "../hosts/HostRegistry.js";
import { createHostContext } from "../detect/context.js";
import { WORKFLOWS } from "../init/workflows.js";
import { MARKER_END, hasManagedMarkers } from "../render/managed-block.js";
import { parseScope } from "./doctor.js";
import { isHostId, type HostId } from "../hosts/types.js";

/**
 * `lambda uninstall` — remove what the manifest says we wrote.
 *
 * The removal rules are `mergeManaged`'s invariant applied in reverse: we
 * created a file, so we may delete it; we promised never to touch what a user
 * appended, so a file with content after MARKER_END is theirs now and stays.
 * A kept file is a result, not a failure, and is reported as one.
 */

export type RemovalOutcome = "removed" | "kept-user-content" | "kept-not-ours" | "already-gone";

const KEEP_REASON: Record<RemovalOutcome, string> = {
  removed: "removed",
  "kept-user-content": "kept — content was appended after the END marker, so this file is yours now",
  "kept-not-ours": "kept — no managed markers, or content differs from what we wrote",
  "already-gone": "already gone",
};

interface Removal {
  readonly absPath: string;
  readonly displayPath: string;
  readonly hostId: HostId;
  readonly outcome: RemovalOutcome;
}

async function classify(absPath: string, kind: string, recordedHash: string): Promise<RemovalOutcome> {
  let content: string;
  try {
    content = await readFile(absPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "already-gone";
    throw error;
  }

  // A package manifest carries no markers, so "did we write this exactly" is
  // the only honest test available for it.
  if (kind === "manifest") {
    return contentHash(content) === recordedHash ? "removed" : "kept-not-ours";
  }

  if (!hasManagedMarkers(content)) return "kept-not-ours";

  const end = content.indexOf(MARKER_END) + MARKER_END.length;
  const trailing = content.slice(end).trim();
  return trailing.length === 0 ? "removed" : "kept-user-content";
}

/** Removes directories we emptied, walking up to (but never past) the host root. */
async function pruneEmptyDirs(fileDirs: ReadonlySet<string>, roots: ReadonlySet<string>): Promise<string[]> {
  const removed: string[] = [];
  const candidates = [...fileDirs].sort((a, b) => b.length - a.length);
  for (const start of candidates) {
    let dir = start;
    while (dir.length > 0) {
      const isRootOrBelow = [...roots].some((root) => dir === root || dir.startsWith(`${root}${path.sep}`));
      if (!isRootOrBelow) break;
      try {
        await rmdir(dir);
        removed.push(dir);
      } catch {
        break; // Not empty, or not ours to remove. Either way, stop climbing.
      }
      dir = path.dirname(dir);
    }
  }
  return removed;
}

function parseTools(args: readonly string[]): readonly HostId[] | undefined {
  let value: string | undefined;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (arg === "--tools") {
      value = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--tools=")) value = arg.slice("--tools=".length);
  }
  if (value === undefined) return undefined;

  const tokens = value.split(",").map((token) => token.trim()).filter((token) => token.length > 0);
  const unknown = tokens.filter((token) => !isHostId(token));
  if (unknown.length > 0) {
    console.error(`unknown tool${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}`);
    process.exit(1);
  }
  return tokens as HostId[];
}

export async function runUninstall(
  args: string[],
  projectRoot: string,
  json: boolean,
  version: string,
): Promise<void> {
  const scope = parseScope(args);
  if (scope === undefined) return;
  const onlyHosts = parseTools(args);
  const pruneOnly = args.includes("--prune");

  const ctx = createHostContext({ projectRoot });
  const registry = HostRegistry.default();
  const location = { home: ctx.home, projectRoot };

  const manifest = await InstallManifest.load(scope, location);
  if (manifest === undefined) {
    console.error(
      `nothing to uninstall: no ${InstallManifest.fileFor(scope, location)}. Host files this CLI did not record are left for you to remove by hand.`,
    );
    process.exit(1);
  }

  const inspection = await inspectInstall(manifest, registry, ctx, WORKFLOWS, version);
  const targeted = inspection.files.filter((file) => {
    if (onlyHosts !== undefined && !onlyHosts.includes(file.hostId)) return false;
    // --prune leaves the current install in place and removes only what an
    // earlier version left behind.
    if (pruneOnly && file.status !== "orphaned") return false;
    return true;
  });

  const removals: Removal[] = [];
  const touchedDirs = new Set<string>();

  for (const file of targeted) {
    const outcome = await classify(file.absPath, file.entry.kind, file.entry.sha256);
    if (outcome === "removed") {
      await rm(file.absPath, { force: true });
      touchedDirs.add(path.dirname(file.absPath));
    }
    removals.push({
      absPath: file.absPath,
      displayPath: file.displayPath,
      hostId: file.hostId,
      outcome,
    });
  }

  const roots = new Set(
    inspection.hosts
      .filter((host) => onlyHosts === undefined || onlyHosts.includes(host.hostId))
      .map((host) => registry.require(host.hostId).layout(ctx, scope).root),
  );
  const removedDirs = await pruneEmptyDirs(touchedDirs, roots);

  // What survives stays recorded: a manifest that forgot a kept file would
  // make the next `doctor` call it an untracked stranger.
  const keptPaths = new Set(
    removals.filter((removal) => removal.outcome !== "removed" && removal.outcome !== "already-gone").map((r) => r.absPath),
  );
  const removedPaths = new Set(removals.filter((r) => r.outcome === "removed" || r.outcome === "already-gone").map((r) => r.absPath));

  const remaining = manifest.data.hosts
    .map((host) => ({
      ...host,
      files: host.files.filter((entry) => !removedPaths.has(manifest.absPathOf(host, entry))),
    }))
    .filter((host) => host.files.length > 0);

  const rewritten = new InstallManifest(
    { ...manifest.data, lambdaVersion: version, hosts: remaining },
    manifest.filePath,
    location,
  );
  if (remaining.length > 0) await rewritten.save();
  else await rm(manifest.filePath, { force: true });

  if (json) {
    console.log(
      JSON.stringify(
        {
          scope,
          removed: removals.filter((r) => r.outcome === "removed").map((r) => r.displayPath),
          kept: removals.filter((r) => keptPaths.has(r.absPath)).map((r) => ({ path: r.displayPath, reason: KEEP_REASON[r.outcome] })),
          removedDirectories: removedDirs,
          manifest: remaining.length > 0 ? manifest.filePath : null,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  const removed = removals.filter((r) => r.outcome === "removed");
  console.log(`uninstalled ${scope} scope${onlyHosts === undefined ? "" : ` (${onlyHosts.join(", ")})`}${pruneOnly ? " — orphans only" : ""}`);
  console.log("");
  if (removed.length > 0) {
    console.log("removed:");
    for (const removal of removed) console.log(`  ${removal.displayPath}`);
    console.log("");
  }
  const kept = removals.filter((r) => keptPaths.has(r.absPath));
  if (kept.length > 0) {
    console.log("kept:");
    for (const removal of kept) console.log(`  ${removal.displayPath}\n    ${KEEP_REASON[removal.outcome]}`);
    console.log("");
  }
  if (removed.length === 0 && kept.length === 0) console.log("nothing matched — nothing to do.\n");

  console.log("The `lambda` binary itself is still installed. There were two installs, so there are");
  console.log("two removals: `install.sh --uninstall` (or `install.ps1 -Uninstall`) for a scripted");
  console.log("install, or `npm uninstall -g recursive-praxis` for an npm one.");
  process.exit(0);
}
