import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import { describe, it } from "vitest";
import { InitWizard } from "../src/init/InitWizard.js";
import {
  FlagWizardIO,
  NeedsFlagError,
  PreAnsweredWizardIO,
  ScriptedWizardIO,
  type WizardIO,
} from "../src/init/WizardIO.js";
import { HostRegistry } from "../src/hosts/HostRegistry.js";
import { createHostContext } from "../src/detect/context.js";
import { WORKFLOWS } from "../src/init/workflows.js";

function sandbox(): { home: string; projectRoot: string; dispose: () => void } {
  const root = mkdtempSync(path.join(os.tmpdir(), "praxis-wizard-"));
  return {
    home: path.join(root, "home"),
    projectRoot: path.join(root, "project"),
    dispose: () => rmSync(root, { recursive: true, force: true }),
  };
}

function wizard(io: WizardIO, home: string, projectRoot: string): InitWizard {
  const ctx = createHostContext({ env: {}, home, projectRoot });
  return new InitWizard(HostRegistry.default(), ctx, io, WORKFLOWS, "9.9.9");
}

describe("InitWizard", () => {
  it("asks exactly two questions — hosts, then scope — and generates", async () => {
    const box = sandbox();
    try {
      const io = new ScriptedWizardIO([["claude"], ["project"]]);
      const report = await wizard(io, box.home, box.projectRoot).run();

      io.assertFullyConsumed();
      assert.deepEqual(io.asked, ["--tools", "--scope"]);
      assert.equal(report.scope, "project");
      assert.deepEqual(
        report.hosts.map((host) => host.hostId),
        ["claude"],
      );
      assert.ok(report.files.every((file) => file.action === "created"));
      assert.ok(existsSync(path.join(box.projectRoot, ".claude/skills/recursive-praxis-status/SKILL.md")));
    } finally {
      box.dispose();
    }
  });

  it("prints all four step headers, in order", async () => {
    const box = sandbox();
    try {
      const io = new ScriptedWizardIO([["cursor"], ["project"]]);
      await wizard(io, box.home, box.projectRoot).run();
      const steps = io.notes.filter((note) => note.startsWith("Step "));
      assert.deepEqual(
        steps.map((note) => note.slice(0, 10)),
        ["Step 1/4 —", "Step 2/4 —", "Step 3/4 —", "Step 4/4 —"],
      );
    } finally {
      box.dispose();
    }
  });

  it("writes under the home directory for global scope, and nowhere in the project", async () => {
    const box = sandbox();
    try {
      const report = await wizard(
        new ScriptedWizardIO([["claude"], ["global"]]),
        box.home,
        box.projectRoot,
      ).run();

      assert.equal(report.scope, "global");
      assert.ok(existsSync(path.join(box.home, ".claude/skills/recursive-praxis/.claude-plugin/plugin.json")));
      assert.ok(!existsSync(path.join(box.projectRoot, ".claude")));
      assert.ok(report.files.every((file) => file.displayPath.startsWith("~/")));
    } finally {
      box.dispose();
    }
  });

  it("records what it wrote in an install manifest", async () => {
    const box = sandbox();
    try {
      const report = await wizard(
        new ScriptedWizardIO([["codex"], ["project"]]),
        box.home,
        box.projectRoot,
      ).run();

      const manifest = JSON.parse(readFileSync(report.manifestPath!, "utf8")) as {
        manifestVersion: number;
        lambdaVersion: string;
        scope: string;
        hosts: { id: string; root: string; files: { path: string; sha256: string }[] }[];
      };
      assert.equal(manifest.manifestVersion, 1);
      assert.equal(manifest.lambdaVersion, "9.9.9");
      assert.equal(manifest.scope, "project");
      assert.deepEqual(manifest.hosts.map((h) => h.id), ["codex"]);
      assert.equal(manifest.hosts[0]!.files.length, WORKFLOWS.length);
      assert.ok(manifest.hosts[0]!.files.every((file) => /^[0-9a-f]{64}$/.test(file.sha256)));
    } finally {
      box.dispose();
    }
  });

  it("leaves no manifest behind when nothing was installed", async () => {
    const box = sandbox();
    try {
      const report = await wizard(
        new ScriptedWizardIO([[], ["project"]]),
        box.home,
        box.projectRoot,
      ).run();
      assert.equal(report.manifestPath, undefined);
      assert.deepEqual(report.files, []);
    } finally {
      box.dispose();
    }
  });

  it("prints the flag line equivalent to the answers just given", async () => {
    const box = sandbox();
    try {
      const report = await wizard(
        new ScriptedWizardIO([["claude", "cursor"], ["global"]]),
        box.home,
        box.projectRoot,
      ).run();
      assert.equal(report.equivalentFlags, "lambda init --tools claude,cursor --scope global");
    } finally {
      box.dispose();
    }
  });
});

describe("FlagWizardIO", () => {
  const ctx = () => createHostContext({ env: {}, home: "/fake/home", projectRoot: "/fake/project" });

  it("names the exact missing flag rather than defaulting silently", async () => {
    const io = new FlagWizardIO({}, undefined);
    await assert.rejects(
      () => new InitWizard(HostRegistry.default(), ctx(), io, WORKFLOWS, "9.9.9").run(),
      (error: unknown) => {
        assert.ok(error instanceof NeedsFlagError);
        assert.equal(error.flag, "--tools");
        assert.match(error.message, /requires --tools/);
        return true;
      },
    );
  });

  it("defaults --scope to project — the narrower of the two consents", async () => {
    const box = sandbox();
    try {
      const io = new FlagWizardIO({ "--tools": ["cursor"] }, undefined);
      const ctxReal = createHostContext({ env: {}, home: box.home, projectRoot: box.projectRoot });
      const report = await new InitWizard(HostRegistry.default(), ctxReal, io, WORKFLOWS, "9.9.9").run();
      assert.equal(report.scope, "project");
      assert.ok(!existsSync(path.join(box.home, ".cursor")));
    } finally {
      box.dispose();
    }
  });
});

describe("PreAnsweredWizardIO", () => {
  it("uses a supplied flag and does not ask, but delegates every other question", async () => {
    const delegate = new ScriptedWizardIO([["global"]]);
    const io = new PreAnsweredWizardIO({ "--tools": ["codex"] }, delegate);
    const box = sandbox();
    try {
      const report = await wizard(io, box.home, box.projectRoot).run();
      assert.deepEqual(delegate.asked, ["--scope"]);
      assert.deepEqual(report.hosts.map((h) => h.hostId), ["codex"]);
      assert.equal(report.scope, "global");
    } finally {
      box.dispose();
    }
  });
});
