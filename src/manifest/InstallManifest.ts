import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ownedHead } from "../render/managed-block.js";
import type { FileKind, HostId, Scope } from "../hosts/types.js";
import type { Confidence } from "../detect/signals.js";
import type { PlannedFile } from "../hosts/HostAdapter.js";

/**
 * A record of what `lambda init` actually wrote, by which version, at which
 * scope.
 *
 * Without it, `doctor`, `uninstall`, and `sync` would each have to re-derive
 * paths from the *current* host table. That table drifts between releases, so
 * every rename would leave orphans no command could see and `uninstall` would
 * be guessing at what to delete. None of the three is trustworthy without
 * this file.
 */

export const MANIFEST_VERSION = 1;
export const MANIFEST_FILE = "install.json";

/**
 * `~/.recursive-praxis-cli`, not `~/.recursive-praxis`: the latter is already
 * the per-project session directory name, and reusing it would collide the
 * moment someone runs `lambda` from `$HOME`.
 */
export const GLOBAL_CLI_DIR = ".recursive-praxis-cli";
export const PROJECT_STATE_DIR = ".recursive-praxis";

export interface ManifestFileEntry {
  /** Relative to the owning host's `root`. */
  readonly path: string;
  readonly kind: FileKind;
  readonly sha256: string;
}

export interface ManifestHostEntry {
  readonly id: HostId;
  readonly detectedAs: Confidence;
  /** Home-relative (`~/…`) at global scope, project-relative at project scope. */
  readonly root: string;
  readonly files: readonly ManifestFileEntry[];
}

export interface InstallManifestData {
  readonly manifestVersion: number;
  readonly lambdaVersion: string;
  readonly scope: Scope;
  readonly hosts: readonly ManifestHostEntry[];
}

export interface ManifestLocation {
  readonly home: string;
  readonly projectRoot: string;
}

/**
 * Hash of exactly what a re-run would overwrite, never the whole file.
 *
 * `mergeManaged` promises that content appended after the END marker survives
 * a re-run, so hashing the whole file would report that promise being kept as
 * drift. A file with no markers at all — a package manifest such as
 * `plugin.json` — is hashed entire, since all of it is ours.
 */
export function contentHash(content: string): string {
  return createHash("sha256").update(ownedHead(content) ?? content, "utf8").digest("hex");
}

/** Portable form for a path inside the home directory. */
export function abbreviate(home: string, absPath: string): string {
  const rel = path.relative(home, absPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return absPath;
  return `~/${rel.split(path.sep).join("/")}`;
}

/** Inverse of `abbreviate`, resolved against *this* machine's home. */
export function expand(home: string, stored: string, projectRoot: string): string {
  if (stored.startsWith("~/")) return path.join(home, stored.slice(2));
  if (path.isAbsolute(stored)) return stored;
  return path.join(projectRoot, stored);
}

export class InstallManifest {
  constructor(
    readonly data: InstallManifestData,
    readonly filePath: string,
    private readonly location: ManifestLocation,
  ) {}

  static fileFor(scope: Scope, location: ManifestLocation): string {
    return scope === "global"
      ? path.join(location.home, GLOBAL_CLI_DIR, MANIFEST_FILE)
      : path.join(location.projectRoot, PROJECT_STATE_DIR, MANIFEST_FILE);
  }

  /** Builds a manifest from a completed generation pass. */
  static fromPlan(
    scope: Scope,
    lambdaVersion: string,
    location: ManifestLocation,
    files: readonly PlannedFile[],
    detectedAs: ReadonlyMap<HostId, Confidence>,
    hostRoots: ReadonlyMap<HostId, string>,
  ): InstallManifest {
    const byHost = new Map<HostId, ManifestFileEntry[]>();
    for (const file of files) {
      const root = hostRoots.get(file.hostId);
      if (root === undefined) continue;
      const entries = byHost.get(file.hostId) ?? [];
      entries.push({
        path: path.relative(root, file.absPath).split(path.sep).join("/"),
        kind: file.kind,
        sha256: contentHash(file.content),
      });
      byHost.set(file.hostId, entries);
    }

    const hosts: ManifestHostEntry[] = [...byHost.entries()].map(([id, entries]) => ({
      id,
      detectedAs: detectedAs.get(id) ?? "absent",
      root:
        scope === "global"
          ? abbreviate(location.home, hostRoots.get(id)!)
          : path.relative(location.projectRoot, hostRoots.get(id)!).split(path.sep).join("/"),
      files: entries,
    }));

    return new InstallManifest(
      { manifestVersion: MANIFEST_VERSION, lambdaVersion, scope, hosts },
      InstallManifest.fileFor(scope, location),
      location,
    );
  }

  static async load(scope: Scope, location: ManifestLocation): Promise<InstallManifest | undefined> {
    const filePath = InstallManifest.fileFor(scope, location);
    let raw: string;
    try {
      raw = await readFile(filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }

    const parsed = JSON.parse(raw) as InstallManifestData;
    if (parsed.manifestVersion !== MANIFEST_VERSION) {
      throw new Error(
        `${filePath} has manifestVersion ${String(parsed.manifestVersion)}; this build understands ${MANIFEST_VERSION}. Re-run \`lambda init\`.`,
      );
    }
    return new InstallManifest(parsed, filePath, location);
  }

  async save(): Promise<string> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(this.data, null, 2)}\n`, "utf8");
    return this.filePath;
  }

  /** Absolute path of a recorded entry on *this* machine. */
  absPathOf(host: ManifestHostEntry, entry: ManifestFileEntry): string {
    const root = expand(this.location.home, host.root, this.location.projectRoot);
    return path.join(root, entry.path);
  }

  /** Every recorded file, flattened, with its absolute path resolved. */
  entries(): readonly { host: ManifestHostEntry; entry: ManifestFileEntry; absPath: string }[] {
    return this.data.hosts.flatMap((host) =>
      host.files.map((entry) => ({ host, entry, absPath: this.absPathOf(host, entry) })),
    );
  }
}
