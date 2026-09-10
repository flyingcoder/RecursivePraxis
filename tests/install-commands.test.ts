import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, existsSync, appendFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, it } from "vitest";
import { MARKER_END } from "../src/render/managed-block.js";

/**
 * `lambda doctor`, `lambda sync`, and `lambda uninstall` against the real
 * binary. Each test gets its own HOME as well as its own project, so a global
 * scope run cannot touch the machine running the suite.
 */

const cliPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/cli.js");

function sandbox(): { root: string; home: string; project: string } {
  const root = mkdtempSync(path.join(os.tmpdir(), "praxis-cmd-"));
  return { root, home: path.join(root, "home"), project: path.join(root, "project") };
}

function runIn(box: { home: string; project: string }, args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
    cwd: box.project,
    env: { ...process.env, HOME: box.home, USERPROFILE: box.home },
  });
}

function withSandbox(body: (box: ReturnType<typeof sandbox>) => void): void {
  const box = sandbox();
  mkdirSync(box.home, { recursive: true });
  mkdirSync(box.project, { recursive: true });
  try {
    body(box);
  } finally {
    rmSync(box.root, { recursive: true, force: true });
  }
}

describe("lambda init --scope", () => {
  it("writes into the project by default and leaves home untouched", () => {
    withSandbox((box) => {
      assert.equal(runIn(box, ["init", "--tools", "claude"]).status, 0);
      assert.ok(existsSync(path.join(box.project, ".claude/skills/recursive-praxis-status/SKILL.md")));
      assert.ok(!existsSync(path.join(box.home, ".claude")));
    });
  });

  it("writes a Claude Code plugin into home at global scope", () => {
    withSandbox((box) => {
      assert.equal(runIn(box, ["init", "--tools", "claude", "--scope", "global"]).status, 0);
      const manifest = path.join(box.home, ".claude/skills/recursive-praxis/.claude-plugin/plugin.json");
      assert.ok(existsSync(manifest));
      assert.equal((JSON.parse(readFileSync(manifest, "utf8")) as { name: string }).name, "recursive-praxis");
      assert.ok(!existsSync(path.join(box.project, ".claude")));
    });
  });

  it("reports the global invocation prefix, which differs from project scope", () => {
    withSandbox((box) => {
      const result = runIn(box, ["init", "--tools", "claude", "--scope", "global", "--json"]);
      const payload = JSON.parse(result.stdout) as {
        scope: string;
        hosts: { invocations: { workflowId: string; invocation: string }[] }[];
      };
      assert.equal(payload.scope, "global");
      assert.equal(
        payload.hosts[0]!.invocations.find((entry) => entry.workflowId === "status")!.invocation,
        "/recursive-praxis:status",
      );
    });
  });

  it("rejects an unknown scope", () => {
    withSandbox((box) => {
      const result = runIn(box, ["init", "--tools", "claude", "--scope", "machine"]);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /unknown scope: machine/);
    });
  });

  it("writes opencode files when asked, and none when not", () => {
    withSandbox((box) => {
      runIn(box, ["init", "--tools", "opencode"]);
      assert.ok(existsSync(path.join(box.project, ".opencode/commands/praxis-status.md")));
      assert.ok(!existsSync(path.join(box.project, ".claude")));
    });
  });
});

describe("lambda doctor", () => {
  it("exits non-zero and says how to install when nothing is installed", () => {
    withSandbox((box) => {
      const result = runIn(box, ["doctor"]);
      assert.equal(result.status, 1);
      assert.match(result.stdout, /not installed/);
      assert.match(result.stdout, /lambda init/);
    });
  });

  it("exits zero on a clean install", () => {
    withSandbox((box) => {
      runIn(box, ["init", "--tools", "claude,codex"]);
      const result = runIn(box, ["doctor"]);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /files\s+\d+ managed/);
    });
  });

  it("reports drift, names the file, and exits non-zero for CI", () => {
    withSandbox((box) => {
      runIn(box, ["init", "--tools", "claude"]);
      const target = path.join(box.project, ".claude/skills/recursive-praxis-ir/SKILL.md");
      writeFileSync(target, readFileSync(target, "utf8").replace("Retrieve the", "EDITED the"), "utf8");

      const result = runIn(box, ["doctor"]);
      assert.equal(result.status, 1);
      assert.match(result.stdout, /1 drifted/);
      assert.match(result.stdout, /recursive-praxis-ir\/SKILL\.md/);
    });
  });

  it("does not call appended user content drift", () => {
    withSandbox((box) => {
      runIn(box, ["init", "--tools", "claude"]);
      appendFileSync(
        path.join(box.project, ".claude/skills/recursive-praxis-status/SKILL.md"),
        "\n\n## Team notes\nkeep me\n",
      );
      assert.equal(runIn(box, ["doctor"]).status, 0);
    });
  });

  it("emits a machine-readable report under --json", () => {
    withSandbox((box) => {
      runIn(box, ["init", "--tools", "codex"]);
      const payload = JSON.parse(runIn(box, ["doctor", "--json"]).stdout) as {
        installed: boolean;
        healthy: boolean;
        counts: Record<string, number>;
        hosts: { hostId: string; verifiedAgainst: string }[];
      };
      assert.equal(payload.installed, true);
      assert.equal(payload.healthy, true);
      assert.ok(payload.counts.managed! > 0);
      assert.ok(payload.hosts[0]!.verifiedAgainst.length > 0);
    });
  });
});

describe("lambda sync", () => {
  it("repairs drift while preserving appended user content", () => {
    withSandbox((box) => {
      runIn(box, ["init", "--tools", "claude"]);
      const drifted = path.join(box.project, ".claude/skills/recursive-praxis-ir/SKILL.md");
      const appended = path.join(box.project, ".claude/skills/recursive-praxis-status/SKILL.md");
      writeFileSync(drifted, readFileSync(drifted, "utf8").replace("Retrieve the", "EDITED the"), "utf8");
      appendFileSync(appended, "\n\n## Team notes\nkeep me\n");

      assert.equal(runIn(box, ["sync"]).status, 0);
      assert.doesNotMatch(readFileSync(drifted, "utf8"), /EDITED the/);
      assert.match(readFileSync(appended, "utf8"), /## Team notes\nkeep me/);
      assert.equal(runIn(box, ["doctor"]).status, 0);
    });
  });

  it("--check exits zero when current and non-zero when not, without writing", () => {
    withSandbox((box) => {
      runIn(box, ["init", "--tools", "claude"]);
      assert.equal(runIn(box, ["sync", "--check"]).status, 0);

      const target = path.join(box.project, ".claude/skills/recursive-praxis-ir/SKILL.md");
      writeFileSync(target, readFileSync(target, "utf8").replace("Retrieve the", "EDITED the"), "utf8");

      const check = runIn(box, ["sync", "--check"]);
      assert.equal(check.status, 1);
      assert.match(check.stdout, /would change/);
      assert.match(readFileSync(target, "utf8"), /EDITED the/, "--check must not write");
    });
  });

  it("refuses to sync when nothing was ever installed", () => {
    withSandbox((box) => {
      const result = runIn(box, ["sync"]);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /nothing to sync/);
    });
  });

  it("is reachable under the `update` alias", () => {
    withSandbox((box) => {
      runIn(box, ["init", "--tools", "claude"]);
      assert.equal(runIn(box, ["update", "--check"]).status, 0);
    });
  });
});

describe("lambda uninstall", () => {
  it("removes what it wrote and prunes the directories it created", () => {
    withSandbox((box) => {
      runIn(box, ["init", "--tools", "codex"]);
      assert.equal(runIn(box, ["uninstall"]).status, 0);
      assert.ok(!existsSync(path.join(box.project, ".agents")));
    });
  });

  it("keeps a file the user appended to, and says why", () => {
    withSandbox((box) => {
      runIn(box, ["init", "--tools", "claude"]);
      const kept = path.join(box.project, ".claude/skills/recursive-praxis-status/SKILL.md");
      appendFileSync(kept, "\n\n## Team notes\nkeep me\n");

      const result = runIn(box, ["uninstall"]);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /kept:/);
      assert.match(result.stdout, /appended after the END marker/);
      assert.ok(existsSync(kept));
      assert.match(readFileSync(kept, "utf8"), /keep me/);
    });
  });

  it("removes one host only when given --tools", () => {
    withSandbox((box) => {
      runIn(box, ["init", "--tools", "claude,codex"]);
      assert.equal(runIn(box, ["uninstall", "--tools", "codex"]).status, 0);
      assert.ok(!existsSync(path.join(box.project, ".agents")));
      assert.ok(existsSync(path.join(box.project, ".claude/skills/recursive-praxis-status/SKILL.md")));
    });
  });

  it("says plainly that the binary itself is still installed", () => {
    withSandbox((box) => {
      runIn(box, ["init", "--tools", "claude"]);
      const result = runIn(box, ["uninstall"]);
      assert.match(result.stdout, /binary itself is still installed/);
      assert.match(result.stdout, /npm uninstall -g recursive-praxis/);
    });
  });

  it("leaves a file it never wrote alone", () => {
    withSandbox((box) => {
      const dir = path.join(box.project, ".claude/skills/recursive-praxis-status");
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, "SKILL.md"), "hand-authored\n", "utf8");

      runIn(box, ["init", "--tools", "claude"]);
      runIn(box, ["uninstall"]);
      assert.equal(readFileSync(path.join(dir, "SKILL.md"), "utf8"), "hand-authored\n");
    });
  });

  it("--prune removes only what an earlier version left behind", () => {
    withSandbox((box) => {
      runIn(box, ["init", "--tools", "claude"]);

      // Stand in for a file a previous release wrote and this one no longer
      // plans: a real recorded entry with no counterpart in the current plan.
      const legacyDir = path.join(box.project, ".claude/skills/recursive-praxis-legacy");
      mkdirSync(legacyDir, { recursive: true });
      const source = readFileSync(
        path.join(box.project, ".claude/skills/recursive-praxis-ir/SKILL.md"),
        "utf8",
      );
      writeFileSync(path.join(legacyDir, "SKILL.md"), source, "utf8");

      const manifestPath = path.join(box.project, ".recursive-praxis/install.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        hosts: { files: { path: string; kind: string; sha256: string }[] }[];
      };
      const end = source.indexOf(MARKER_END) + MARKER_END.length;
      manifest.hosts[0]!.files.push({
        path: "skills/recursive-praxis-legacy/SKILL.md",
        kind: "skill",
        sha256: createHash("sha256").update(source.slice(0, end), "utf8").digest("hex"),
      });
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

      const before = runIn(box, ["doctor"]);
      assert.equal(before.status, 1);
      assert.match(before.stdout, /1 orphaned/);

      assert.equal(runIn(box, ["uninstall", "--prune"]).status, 0);
      assert.ok(!existsSync(path.join(legacyDir, "SKILL.md")));
      assert.ok(existsSync(path.join(box.project, ".claude/skills/recursive-praxis-ir/SKILL.md")));
      assert.equal(runIn(box, ["doctor"]).status, 0);
    });
  });

  it("refuses to guess when there is no manifest", () => {
    withSandbox((box) => {
      const result = runIn(box, ["uninstall"]);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /nothing to uninstall/);
    });
  });
});
