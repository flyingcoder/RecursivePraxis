import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { describe, it } from "vitest";
import { autoSelects, rankConfidence, type HostSignal } from "../src/detect/signals.js";
import { createHostContext } from "../src/detect/context.js";
import { HostRegistry } from "../src/hosts/HostRegistry.js";
import { WORKFLOWS } from "../src/init/workflows.js";
import { fakeContext, FAKE_HOME, FAKE_PROJECT } from "./support/fake-host-context.js";

const signal = (kind: HostSignal["kind"]): HostSignal => ({ kind, detail: kind, heuristic: kind === "env" });

describe("confidence ladder", () => {
  it("ranks env highest — that host is executing us right now", () => {
    assert.equal(rankConfidence([signal("config"), signal("binary"), signal("env")]), "running-here");
  });

  it("ranks a project config dir above a binary on PATH", () => {
    assert.equal(rankConfidence([signal("binary"), signal("project")]), "active-here");
  });

  it("ranks a binary above a user config dir", () => {
    assert.equal(rankConfidence([signal("config"), signal("binary")]), "installed");
  });

  it("reports absent with no signals at all", () => {
    assert.equal(rankConfidence([]), "absent");
  });
});

describe("default selection", () => {
  it("checks a host that is both installed and configured", () => {
    assert.equal(autoSelects([signal("binary"), signal("config")]), true);
  });

  it("leaves a host unchecked when installed OR configured but not both", () => {
    assert.equal(autoSelects([signal("binary")]), false);
    assert.equal(autoSelects([signal("config")]), false);
  });

  it("checks a host running us, even on its own", () => {
    assert.equal(autoSelects([signal("env")]), true);
  });

  it("leaves an entirely undetected host unchecked", () => {
    assert.equal(autoSelects([]), false);
  });
});

// --- the two detection traps named in the design ------------------------------

describe("detection traps", () => {
  const registry = HostRegistry.default();

  it("does not treat AGENTS.md as evidence of Codex", () => {
    const ctx = fakeContext({ paths: [path.join(FAKE_PROJECT, "AGENTS.md")] });
    const codex = registry.require("codex").detect(ctx, WORKFLOWS);
    assert.equal(codex.confidence, "absent");
  });

  it("does not detect itself: .agents/skills holding only our own files is not Codex", () => {
    const skills = path.join(FAKE_PROJECT, ".agents", "skills");
    const ctx = fakeContext({
      dirs: { [skills]: ["recursive-praxis-status", "recursive-praxis-ir"] },
    });
    const codex = registry.require("codex").detect(ctx, WORKFLOWS);
    assert.equal(codex.confidence, "absent");
  });

  it("does count .agents/skills as Codex evidence once a foreign skill is present", () => {
    const skills = path.join(FAKE_PROJECT, ".agents", "skills");
    const ctx = fakeContext({
      dirs: { [skills]: ["recursive-praxis-status", "some-other-teams-skill"] },
    });
    const codex = registry.require("codex").detect(ctx, WORKFLOWS);
    assert.equal(codex.confidence, "configured");
  });

  it("reports our own generated files as alreadyInitialized, not as detection", () => {
    const ctx = fakeContext({
      dirs: { [path.join(FAKE_PROJECT, ".agents", "skills")]: ["recursive-praxis-status"] },
      paths: [path.join(FAKE_PROJECT, ".agents", "skills", "recursive-praxis-status", "SKILL.md")],
    });
    const codex = registry.require("codex").detect(ctx, WORKFLOWS);
    assert.equal(codex.alreadyInitialized, true);
    assert.equal(codex.confidence, "absent");
  });

  it("labels env markers as heuristic so Step 1 can say so", () => {
    const ctx = fakeContext({ env: { CLAUDECODE: "1" } });
    const claude = registry.require("claude").detect(ctx, WORKFLOWS);
    assert.equal(claude.confidence, "running-here");
    assert.ok(claude.signals.every((s) => s.kind !== "env" || s.heuristic));
    assert.match(claude.signals.find((s) => s.kind === "env")!.detail, /heuristic/);
  });
});

describe("per-host probes", () => {
  const registry = HostRegistry.default();

  it("finds Claude Code by binary plus user config", () => {
    const ctx = fakeContext({
      binaries: { claude: "/usr/local/bin/claude" },
      paths: [path.join(FAKE_HOME, ".claude")],
    });
    const detection = registry.require("claude").detect(ctx, WORKFLOWS);
    assert.equal(detection.confidence, "installed");
    assert.equal(detection.defaultSelected, true);
  });

  it("finds Cursor via cursor-agent as well as cursor", () => {
    const ctx = fakeContext({ binaries: { "cursor-agent": "/usr/local/bin/cursor-agent" } });
    assert.equal(registry.require("cursor").detect(ctx, WORKFLOWS).confidence, "installed");
  });

  it("finds opencode by its project config file", () => {
    const ctx = fakeContext({ paths: [path.join(FAKE_PROJECT, "opencode.jsonc")] });
    assert.equal(registry.require("opencode").detect(ctx, WORKFLOWS).confidence, "active-here");
  });

  it("reports every host absent on an empty machine", () => {
    const detections = registry.detectAll(fakeContext(), WORKFLOWS);
    assert.equal(detections.length, 4);
    assert.ok(detections.every((d) => d.confidence === "absent" && !d.defaultSelected));
  });
});

// --- PATH resolution ----------------------------------------------------------

describe("onPath", () => {
  it("honours PATHEXT on Windows, where a bare name is not executable", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "praxis-path-"));
    try {
      writeFileSync(path.join(dir, "claude.CMD"), "", "utf8");

      const windows = createHostContext({
        platform: "win32",
        env: { PATH: dir, PATHEXT: ".EXE;.CMD" },
        exists: () => false,
        readDir: () => [],
      });
      assert.equal(windows.onPath("claude"), path.join(dir, "claude.CMD"));

      // The same directory on a POSIX platform: `claude` alone is not there,
      // and the resolver must not silently accept `claude.CMD` for it.
      const posix = createHostContext({
        platform: "linux",
        env: { PATH: dir },
        exists: () => false,
        readDir: () => [],
      });
      assert.equal(posix.onPath("claude"), undefined);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("resolves a plain executable on a POSIX PATH", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "praxis-path-"));
    try {
      writeFileSync(path.join(dir, "opencode"), "", "utf8");
      const ctx = createHostContext({
        platform: "linux",
        env: { PATH: `/nonexistent${path.delimiter}${dir}` },
        exists: () => false,
        readDir: () => [],
      });
      assert.equal(ctx.onPath("opencode"), path.join(dir, "opencode"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns undefined rather than guessing when PATH is empty", () => {
    const ctx = createHostContext({ platform: "linux", env: {}, exists: () => false, readDir: () => [] });
    assert.equal(ctx.onPath("claude"), undefined);
  });
});
