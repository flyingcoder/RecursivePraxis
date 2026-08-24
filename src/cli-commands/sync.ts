import { InstallManifest } from "../manifest/InstallManifest.js";
import { inspectInstall } from "../manifest/inspect.js";
import { HostRegistry } from "../hosts/HostRegistry.js";
import { createHostContext } from "../detect/context.js";
import { WORKFLOWS } from "../init/workflows.js";
import { FileWriter, type FileWriteResult } from "../init/write.js";
import { parseScope } from "./doctor.js";
import type { HostId } from "../hosts/types.js";
import type { Confidence } from "../detect/signals.js";

/**
 * `lambda sync` — regenerate every managed file from the manifest.
 *
 * This re-runs Step 4 with the hosts and scope already recorded, asks
 * nothing, and refreshes managed regions in place. It is what a human wants
 * after upgrading the CLI, and what CI wants as a "generated files are
 * current" gate via `--check`.
 *
 * It is deliberately *not* a self-update. `lambda update` is only an alias,
 * and upgrading the binary is `install.sh` re-run or `npm i -g`: a CLI that
 * rewrites its own executable is a materially larger security surface for a
 * runtime whose premise is bounded, auditable execution.
 */
export async function runSync(
  args: string[],
  projectRoot: string,
  json: boolean,
  version: string,
): Promise<void> {
  const scope = parseScope(args);
  if (scope === undefined) return;
  const checkOnly = args.includes("--check");

  const ctx = createHostContext({ projectRoot });
  const registry = HostRegistry.default();
  const location = { home: ctx.home, projectRoot };

  const manifest = await InstallManifest.load(scope, location);
  if (manifest === undefined) {
    console.error(
      `nothing to sync: no ${InstallManifest.fileFor(scope, location)}. Run \`lambda init --scope ${scope}\` first.`,
    );
    process.exit(1);
  }

  const inspection = await inspectInstall(manifest, registry, ctx, WORKFLOWS, version);
  const writer = new FileWriter();

  if (checkOnly) {
    // A check must not write, so "would change" is decided by comparing the
    // freshly planned content against what is on disk — the same comparison
    // `write` would make, minus the write.
    const stale = inspection.files.filter(
      (file) => file.status === "drifted" || file.status === "missing" || file.status === "orphaned",
    );
    const report = { scope, wouldChange: stale.map((file) => file.displayPath), version };
    if (json) console.log(JSON.stringify(report, null, 2));
    else if (stale.length === 0) console.log(`sync --check: up to date at ${version}.`);
    else {
      console.log("sync --check: these would change —");
      for (const file of stale) console.log(`  ${file.status.padEnd(9)} ${file.displayPath}`);
    }
    process.exit(stale.length === 0 && !inspection.versionStale ? 0 : 1);
  }

  const results: FileWriteResult[] = [];
  for (const file of inspection.planned) {
    results.push(await writer.write(file));
  }

  // Re-record with the *current* version and the same host set, so the next
  // `doctor` compares against what is actually on disk now.
  const owned = inspection.planned.filter((file) =>
    results.some((result) => result.absPath === file.absPath && result.action !== "skipped"),
  );
  const hostRoots = new Map<HostId, string>();
  const detectedAs = new Map<HostId, Confidence>();
  for (const host of inspection.hosts) {
    const adapter = registry.require(host.hostId);
    hostRoots.set(host.hostId, adapter.layout(ctx, scope).root);
    detectedAs.set(host.hostId, host.currentConfidence);
  }

  const refreshed = InstallManifest.fromPlan(scope, version, location, owned, detectedAs, hostRoots);
  const manifestPath = await refreshed.save();

  if (json) {
    console.log(JSON.stringify({ scope, version, manifest: manifestPath, files: results }, null, 2));
    process.exit(0);
  }

  const changed = results.filter((result) => result.action !== "preserved");
  console.log(`synced ${scope} scope to ${version} (${inspection.planned.length} managed files).`);
  for (const result of changed) {
    console.log(`  ${result.action.padEnd(10)} ${result.displayPath}`);
  }
  if (changed.length === 0) console.log("  everything was already current.");
  if (inspection.counts.orphaned > 0) {
    console.log(
      `\n${inspection.counts.orphaned} orphaned file(s) remain from ${inspection.recordedVersion} — remove with \`lambda uninstall --prune --scope ${scope}\`.`,
    );
  }
  console.log(`\nRecorded in ${manifestPath}.`);
  process.exit(0);
}
