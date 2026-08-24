#!/usr/bin/env node
/**
 * Builds the Tier B release artifact: `dist/`, the production dependency tree,
 * and a launcher that runs the system Node.
 *
 * Tier B deliberately ships first, with Tier A's exact paths, environment
 * variables, and uninstall semantics already in place — so upgrading to a
 * self-contained bundle later is a change of artifact, not a change of UX.
 * The prerequisite for Tier A is already met: no dependency is native, so
 * nothing here needs node-gyp and nothing blocks bundling.
 *
 * Each target is staged separately with npm's `--os`/`--cpu`, because the
 * dependency tree is not platform-neutral: the Anthropic and Cursor SDKs pull
 * per-platform optional packages. Staging once and copying would put macOS
 * binaries inside the Linux tarball — an artifact that installs cleanly and
 * then fails at the first `lambda run`.
 */

import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(repoRoot, "release");
const stage = path.join(outDir, "lambda");

/** Release target → the `--os`/`--cpu` pair npm needs to resolve its optional deps. */
export const TARGETS = [
  { name: "darwin-arm64", os: "darwin", cpu: "arm64" },
  { name: "darwin-x64", os: "darwin", cpu: "x64" },
  { name: "linux-arm64", os: "linux", cpu: "arm64" },
  { name: "linux-x64", os: "linux", cpu: "x64" },
  { name: "win32-x64", os: "win32", cpu: "x64" },
];

const LAUNCHER = `#!/bin/sh
# Runs the RecursivePraxis CLI on the system Node. Resolves through symlinks so
# that \\$BIN_DIR/lambda -> versions/<v>/bin/lambda finds its own dist/.
self="$0"
while [ -L "$self" ]; do
  link="$(readlink "$self")"
  case "$link" in
    /*) self="$link" ;;
    *) self="$(dirname "$self")/$link" ;;
  esac
done
root="$(cd "$(dirname "$self")/.." && pwd)"
exec node "$root/dist/cli.js" "$@"
`;

function run(command, args, cwd = repoRoot) {
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

function main() {
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  run("npm", ["run", "build"]);

  // `lambda --version` reads package.json at runtime, and the runtime needs a
  // resolvable dependency tree, so both ship. Scripts are stripped: `prepare`
  // would try to rebuild from sources the artifact does not contain.
  const { scripts: _scripts, devDependencies: _dev, ...runtimePkg } = pkg;

  for (const target of TARGETS) {
    const stage = path.join(outDir, `lambda-${target.name}`);
    mkdirSync(stage, { recursive: true });

    cpSync(path.join(repoRoot, "dist"), path.join(stage, "dist"), { recursive: true });
    cpSync(path.join(repoRoot, "README.md"), path.join(stage, "README.md"));
    cpSync(path.join(repoRoot, "LICENSE"), path.join(stage, "LICENSE"));
    writeFileSync(path.join(stage, "package.json"), `${JSON.stringify(runtimePkg, null, 2)}\n`, "utf8");

    run(
      "npm",
      [
        "install",
        "--omit=dev",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        `--os=${target.os}`,
        `--cpu=${target.cpu}`,
      ],
      stage,
    );

    mkdirSync(path.join(stage, "bin"), { recursive: true });
    writeFileSync(path.join(stage, "bin", "lambda"), LAUNCHER, "utf8");
    chmodSync(path.join(stage, "bin", "lambda"), 0o755);

    run("tar", ["-czf", path.join(outDir, `lambda-${target.name}.tar.gz`), "-C", stage, "."]);
    rmSync(stage, { recursive: true, force: true });
  }

  console.log(`built ${TARGETS.length} artifacts for ${pkg.version} in ${outDir}`);
}

main();
