import path from "node:path";
import { InstallManifest } from "../manifest/InstallManifest.js";
import { inspectInstall, STATUS_NOTE, type FileStatus } from "../manifest/inspect.js";
import { HostRegistry } from "../hosts/HostRegistry.js";
import { createHostContext } from "../detect/context.js";
import { CONFIDENCE_LABEL } from "../detect/signals.js";
import { WORKFLOWS } from "../init/workflows.js";
import { isScope, SCOPES, type Scope } from "../hosts/types.js";
import { Settings, INIT_SETTING_KEYS } from "../config/settings.js";

/**
 * `lambda doctor` — verify what `init` wrote, and say what is wrong with it.
 *
 * Four things nothing else catches: a managed region edited by hand, orphans
 * left by a previous version, a manifest older than the CLI, and a host whose
 * files are still installed after the host itself has disappeared. It exits
 * non-zero on any of them so it works as a CI gate.
 *
 * This is also where detection output lands now that there is no `lambda
 * detect` command — the scriptable, bug-report-friendly view of the same
 * evidence the wizard shows in Step 1, which was the whole argument for a
 * separate command in the first place.
 */

const REPORTED: readonly FileStatus[] = ["drifted", "orphaned", "missing", "foreign"];

export async function runDoctor(
  args: string[],
  projectRoot: string,
  baseDir: string,
  json: boolean,
  version: string,
): Promise<void> {
  const scope = parseScope(args);
  if (scope === undefined) return;

  const ctx = createHostContext({ projectRoot });
  const registry = HostRegistry.default();
  const location = { home: ctx.home, projectRoot };

  const manifest = await InstallManifest.load(scope, location);
  const settings = await Settings.load({ cwd: projectRoot, baseDir });

  if (manifest === undefined) {
    const detections = registry.detectAll(ctx, WORKFLOWS);
    if (json) {
      console.log(
        JSON.stringify(
          {
            scope,
            installed: false,
            manifest: InstallManifest.fileFor(scope, location),
            hosts: detections.map((d) => ({ id: d.hostId, confidence: d.confidence })),
          },
          null,
          2,
        ),
      );
    } else {
      console.log(`runtime      node ${process.version} · lambda ${version}`);
      console.log(`install      ${scope}   not installed (no ${InstallManifest.fileFor(scope, location)})`);
      console.log(
        `hosts        ${detections.map((d) => `${d.label} ${CONFIDENCE_LABEL[d.confidence]}`).join(" · ")}`,
      );
      console.log("");
      console.log(`Run \`lambda init --scope ${scope}\` to install.`);
    }
    process.exit(1);
  }

  const inspection = await inspectInstall(manifest, registry, ctx, WORKFLOWS, version);

  if (json) {
    console.log(
      JSON.stringify(
        {
          scope,
          installed: true,
          manifest: inspection.manifestPath,
          recordedVersion: inspection.recordedVersion,
          currentVersion: inspection.currentVersion,
          versionStale: inspection.versionStale,
          counts: inspection.counts,
          hosts: inspection.hosts,
          files: inspection.files.map((file) => ({
            hostId: file.hostId,
            path: file.displayPath,
            status: file.status,
          })),
          healthy: inspection.healthy,
        },
        null,
        2,
      ),
    );
    process.exit(inspection.healthy ? 0 : 1);
  }

  console.log(`runtime      node ${process.version} (>=20 ok) · lambda ${version}`);
  console.log(
    `install      ${scope}   ${inspection.manifestPath}   written by ${inspection.recordedVersion}`,
  );
  console.log(
    `hosts        ${inspection.hosts
      .map((host) => `${host.label} ${CONFIDENCE_LABEL[host.currentConfidence]}`)
      .join(" · ")}`,
  );

  const summary = (Object.entries(inspection.counts) as [FileStatus, number][])
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `${count} ${status}`)
    .join(" · ");
  console.log(`files        ${summary.length === 0 ? "none recorded" : summary}`);

  for (const status of REPORTED) {
    for (const file of inspection.files.filter((candidate) => candidate.status === status)) {
      console.log(`               ${status.padEnd(9)} ${file.displayPath}`);
      console.log(`                         (${STATUS_NOTE[status]})`);
    }
  }

  for (const host of inspection.hosts) {
    if (host.vanished) {
      console.log(
        `               host      ${host.label} has installed files but no signal on this machine — \`lambda uninstall --tools ${host.hostId}\``,
      );
    }
    if (host.layoutMissing) {
      console.log(
        `               layout    ${host.label} directory not found (paths verified against ${host.verifiedAgainst})`,
      );
    }
  }

  const configSettings = INIT_SETTING_KEYS.map((key) => [key, settings.get(key)] as const).filter(
    (entry): entry is readonly [(typeof INIT_SETTING_KEYS)[number], string] => entry[1] !== undefined,
  );
  console.log(
    `config       ${path.relative(projectRoot, settings.configFilePath()) || settings.configFilePath()}   ${configSettings
      .map(([key, value]) => `${key}=${value}${settings.sourceOf(key) === "default" ? " (default)" : ""}`)
      .join(" · ")}`,
  );

  console.log(
    inspection.versionStale
      ? `version      manifest ${inspection.recordedVersion} ≠ cli ${inspection.currentVersion} — run \`lambda sync\``
      : `version      manifest and cli agree at ${inspection.currentVersion}`,
  );

  process.exit(inspection.healthy ? 0 : 1);
}

/** Shared `--scope` parsing for doctor / sync / uninstall. Exits on a bad value. */
export function parseScope(args: readonly string[]): Scope | undefined {
  let value: string | undefined;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (arg === "--scope") {
      value = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--scope=")) value = arg.slice("--scope=".length);
  }
  if (value === undefined) return "project";
  if (!isScope(value)) {
    console.error(`unknown scope: ${value} (expected ${SCOPES.join(" or ")})`);
    process.exit(1);
  }
  return value;
}
