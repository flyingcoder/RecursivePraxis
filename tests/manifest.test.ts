import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { describe, it } from "vitest";
import {
  InstallManifest,
  abbreviate,
  contentHash,
  expand,
} from "../src/manifest/InstallManifest.js";
import { inspectInstall } from "../src/manifest/inspect.js";
import { HostRegistry } from "../src/hosts/HostRegistry.js";
import { createHostContext } from "../src/detect/context.js";
import { WORKFLOWS } from "../src/init/workflows.js";
import { renderManagedHead } from "../src/render/managed-block.js";

describe("contentHash", () => {
  it("ignores content appended after the END marker — that is the user's, by promise", () => {
    const head = renderManagedHead("---\nname: x\n---", "body");
    assert.equal(contentHash(head), contentHash(`${head}\n## my notes\nkeep me\n`));
  });

  it("covers the frontmatter, which a re-run also overwrites", () => {
    assert.notEqual(
      contentHash(renderManagedHead("---\nname: x\n---", "body")),
      contentHash(renderManagedHead("---\nname: edited\n---", "body")),
    );
  });

  it("changes when the managed region itself changes", () => {
    const before = renderManagedHead("---\nname: x\n---", "body");
    const after = renderManagedHead("---\nname: x\n---", "edited body");
    assert.notEqual(contentHash(before), contentHash(after));
  });

  it("hashes a markerless file entire — all of a plugin.json is ours", () => {
    assert.notEqual(contentHash('{"version":"1"}'), contentHash('{"version":"2"}'));
  });
});

describe("portable paths", () => {
  it("abbreviates and re-expands a path inside home", () => {
    const home = path.join(path.sep, "home", "someone");
    const abs = path.join(home, ".claude", "skills");
    assert.equal(abbreviate(home, abs), "~/.claude/skills");
    assert.equal(expand(home, "~/.claude/skills", "/anywhere"), abs);
  });

  it("leaves a path outside home absolute", () => {
    const home = path.join(path.sep, "home", "someone");
    const outside = path.join(path.sep, "opt", "tools");
    assert.equal(abbreviate(home, outside), outside);
  });

  it("resolves a project-relative root against the project, not home", () => {
    assert.equal(
      expand(path.join(path.sep, "home"), ".claude", path.join(path.sep, "repo")),
      path.join(path.sep, "repo", ".claude"),
    );
  });
});

describe("manifest round trip", () => {
  it("refuses a manifest written by an incompatible future version", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "praxis-manifest-"));
    try {
      const file = InstallManifest.fileFor("project", { home: root, projectRoot: root });
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify({ manifestVersion: 99, hosts: [] }), "utf8");
      await assert.rejects(
        () => InstallManifest.load("project", { home: root, projectRoot: root }),
        /manifestVersion 99/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns undefined, not an error, when nothing is installed", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "praxis-manifest-"));
    try {
      assert.equal(await InstallManifest.load("global", { home: root, projectRoot: root }), undefined);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("inspectInstall", () => {
  async function installed(): Promise<{
    root: string;
    inspect: (version?: string) => ReturnType<typeof inspectInstall>;
  }> {
    const root = mkdtempSync(path.join(os.tmpdir(), "praxis-inspect-"));
    const home = path.join(root, "home");
    const projectRoot = path.join(root, "project");
    const ctx = createHostContext({ env: {}, home, projectRoot });
    const registry = HostRegistry.default();
    const claude = registry.require("claude");

    const planned = claude.plan(WORKFLOWS, ctx, "project", { version: "1.0.0" });
    const { FileWriter } = await import("../src/init/write.js");
    const writer = new FileWriter();
    for (const file of planned) await writer.write(file);

    const manifest = InstallManifest.fromPlan(
      "project",
      "1.0.0",
      { home, projectRoot },
      planned,
      new Map([["claude", "installed"]]),
      new Map([["claude", claude.layout(ctx, "project").root]]),
    );
    await manifest.save();

    return {
      root,
      inspect: async (version = "1.0.0") => {
        const loaded = (await InstallManifest.load("project", { home, projectRoot }))!;
        return inspectInstall(loaded, registry, ctx, WORKFLOWS, version);
      },
    };
  }

  it("reports a fresh install as entirely managed and healthy", async () => {
    const { root, inspect } = await installed();
    try {
      const result = await inspect();
      assert.equal(result.counts.drifted, 0);
      assert.equal(result.counts.orphaned, 0);
      assert.equal(result.counts.missing, 0);
      assert.ok(result.counts.managed > 0);
      assert.equal(result.healthy, true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports a hand-edited body as drifted", async () => {
    const { root, inspect } = await installed();
    try {
      const target = path.join(root, "project", ".claude/skills/recursive-praxis-status/SKILL.md");
      const { readFileSync } = await import("node:fs");
      writeFileSync(
        target,
        readFileSync(target, "utf8").replace("without changing anything", "EDITED BY HAND"),
        "utf8",
      );
      const result = await inspect();
      assert.equal(result.counts.drifted, 1);
      assert.equal(result.healthy, false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not report appended user content as drift", async () => {
    const { root, inspect } = await installed();
    try {
      const target = path.join(root, "project", ".claude/skills/recursive-praxis-status/SKILL.md");
      const { appendFileSync } = await import("node:fs");
      appendFileSync(target, "\n\n## Team notes\nkeep me\n");
      const result = await inspect();
      assert.equal(result.counts.drifted, 0);
      assert.equal(result.healthy, true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports a deleted file as missing", async () => {
    const { root, inspect } = await installed();
    try {
      rmSync(path.join(root, "project", ".claude/commands/praxis/ir.md"));
      const result = await inspect();
      assert.equal(result.counts.missing, 1);
      assert.equal(result.healthy, false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a manifest older than the CLI as stale", async () => {
    const { root, inspect } = await installed();
    try {
      const result = await inspect("2.0.0");
      assert.equal(result.versionStale, true);
      assert.equal(result.healthy, false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("drift boundary", () => {
  it("counts a hand-edited frontmatter as drift, since sync will overwrite it", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "praxis-fm-"));
    try {
      const home = path.join(root, "home");
      const projectRoot = path.join(root, "project");
      const ctx = createHostContext({ env: {}, home, projectRoot });
      const registry = HostRegistry.default();
      const claude = registry.require("claude");
      const planned = claude.plan(WORKFLOWS, ctx, "project", { version: "1.0.0" });
      const { FileWriter } = await import("../src/init/write.js");
      const writer = new FileWriter();
      for (const file of planned) await writer.write(file);
      await InstallManifest.fromPlan(
        "project",
        "1.0.0",
        { home, projectRoot },
        planned,
        new Map([["claude", "installed"]]),
        new Map([["claude", claude.layout(ctx, "project").root]]),
      ).save();

      const target = path.join(projectRoot, ".claude/skills/recursive-praxis-status/SKILL.md");
      const { readFileSync } = await import("node:fs");
      writeFileSync(target, readFileSync(target, "utf8").replace("description:", "description: EDITED"), "utf8");

      const loaded = (await InstallManifest.load("project", { home, projectRoot }))!;
      const result = await inspectInstall(loaded, registry, ctx, WORKFLOWS, "1.0.0");
      assert.equal(result.counts.drifted, 1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
