import { readFile } from "node:fs/promises";
import path from "node:path";
import { hasManagedMarkers } from "../render/managed-block.js";
import { contentHash, type InstallManifest, type ManifestFileEntry } from "./InstallManifest.js";
import type { HostRegistry } from "../hosts/HostRegistry.js";
import type { HostContext } from "../detect/context.js";
import type { PlannedFile } from "../hosts/HostAdapter.js";
import type { HostId } from "../hosts/types.js";
import type { WorkflowDefinition } from "../init/workflows.js";
import type { Confidence } from "../detect/signals.js";

/**
 * What the manifest claims, checked against what is on disk and against what
 * this version of the CLI would write now.
 *
 * `doctor`, `sync`, and `uninstall` all need the same four facts — drift,
 * orphans, a stale manifest, and a host whose files remain after the host
 * itself has gone — so they are computed once here rather than three times
 * with three chances to disagree.
 */

export type FileStatus = "managed" | "drifted" | "missing" | "orphaned" | "foreign";

export const STATUS_NOTE: Record<FileStatus, string> = {
  managed: "up to date",
  drifted: "managed region edited by hand — `lambda sync` will overwrite",
  missing: "recorded but not on disk — `lambda sync` will recreate",
  orphaned: "written by an earlier version; not planned by this one — `lambda uninstall --prune`",
  foreign: "no managed markers — not ours, left untouched",
};

export interface FileFinding {
  readonly hostId: HostId;
  readonly absPath: string;
  readonly displayPath: string;
  readonly status: FileStatus;
  readonly entry: ManifestFileEntry;
}

export interface HostFinding {
  readonly hostId: HostId;
  readonly label: string;
  readonly recordedAs: Confidence;
  readonly currentConfidence: Confidence;
  /** Files are installed but the host now shows no signal at all. */
  readonly vanished: boolean;
  /** The vendor release this adapter's paths were checked against. */
  readonly verifiedAgainst: string;
  /** True when the layout the adapter names does not exist on disk. */
  readonly layoutMissing: boolean;
}

export interface InstallInspection {
  readonly manifestPath: string;
  readonly recordedVersion: string;
  readonly currentVersion: string;
  readonly versionStale: boolean;
  readonly hosts: readonly HostFinding[];
  readonly files: readonly FileFinding[];
  readonly counts: Readonly<Record<FileStatus, number>>;
  /** Every file this build would write now, for the manifest's hosts and scope. */
  readonly planned: readonly PlannedFile[];
  /** Whether anything here should make a CI check fail. */
  readonly healthy: boolean;
}

async function readIfExists(absPath: string): Promise<string | undefined> {
  try {
    return await readFile(absPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function inspectInstall(
  manifest: InstallManifest,
  registry: HostRegistry,
  ctx: HostContext,
  workflows: readonly WorkflowDefinition[],
  currentVersion: string,
): Promise<InstallInspection> {
  const scope = manifest.data.scope;

  const planned: PlannedFile[] = [];
  const hosts: HostFinding[] = [];

  for (const recorded of manifest.data.hosts) {
    const adapter = registry.get(recorded.id);
    if (adapter === undefined) continue;

    planned.push(...adapter.plan(workflows, ctx, scope, { version: currentVersion }));

    const detection = adapter.detect(ctx, workflows);
    hosts.push({
      hostId: adapter.id,
      label: adapter.label,
      recordedAs: recorded.detectedAs,
      currentConfidence: detection.confidence,
      vanished: detection.confidence === "absent",
      verifiedAgainst: adapter.verifiedAgainst,
      layoutMissing: !ctx.exists(adapter.layout(ctx, scope).root),
    });
  }

  const plannedPaths = new Set(planned.map((file) => file.absPath));
  const files: FileFinding[] = [];

  for (const { host, entry, absPath } of manifest.entries()) {
    const displayPath = path.join(host.root, entry.path);
    const existing = await readIfExists(absPath);

    const status = ((): FileStatus => {
      if (existing === undefined) return "missing";
      if (!plannedPaths.has(absPath)) return "orphaned";
      if (entry.kind !== "manifest" && !hasManagedMarkers(existing)) return "foreign";
      return contentHash(existing) === entry.sha256 ? "managed" : "drifted";
    })();

    files.push({ hostId: host.id, absPath, displayPath, status, entry });
  }

  const counts: Record<FileStatus, number> = {
    managed: 0,
    drifted: 0,
    missing: 0,
    orphaned: 0,
    foreign: 0,
  };
  for (const file of files) counts[file.status] += 1;

  const versionStale = manifest.data.lambdaVersion !== currentVersion;
  const healthy =
    counts.drifted === 0 &&
    counts.orphaned === 0 &&
    counts.missing === 0 &&
    !versionStale &&
    hosts.every((host) => !host.vanished);

  return {
    manifestPath: manifest.filePath,
    recordedVersion: manifest.data.lambdaVersion,
    currentVersion,
    versionStale,
    hosts,
    files,
    counts,
    planned,
    healthy,
  };
}
