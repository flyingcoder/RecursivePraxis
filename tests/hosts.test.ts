import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "vitest";
import { HostRegistry } from "../src/hosts/HostRegistry.js";
import { HOST_IDS } from "../src/hosts/types.js";
import { parseToolsValue } from "../src/hosts/tools-flag.js";
import { WORKFLOWS, WORKFLOW_IDS } from "../src/init/workflows.js";
import { fakeContext, FAKE_HOME, FAKE_PROJECT } from "./support/fake-host-context.js";

const registry = HostRegistry.default();
const ctx = fakeContext();

function planFor(hostId: (typeof HOST_IDS)[number], scope: "project" | "global") {
  return registry.require(hostId).plan(WORKFLOWS, ctx, scope, { version: "9.9.9" });
}

function relPaths(hostId: (typeof HOST_IDS)[number], scope: "project" | "global"): string[] {
  return planFor(hostId, scope).map((file) => file.relPath);
}

// --- project scope: unchanged from what init has always written ------------------

describe("project-scope layouts", () => {
  it("gives Claude Code a skill and a command per workflow", () => {
    const paths = relPaths("claude", "project");
    for (const id of WORKFLOW_IDS) {
      assert.ok(paths.includes(`.claude/skills/recursive-praxis-${id}/SKILL.md`));
      assert.ok(paths.includes(`.claude/commands/praxis/${id}.md`));
    }
  });

  it("gives Cursor a skill and a flat command per workflow", () => {
    const paths = relPaths("cursor", "project");
    for (const id of WORKFLOW_IDS) {
      assert.ok(paths.includes(`.cursor/skills/recursive-praxis-${id}/SKILL.md`));
      assert.ok(paths.includes(`.cursor/commands/praxis-${id}.md`));
    }
  });

  it("gives Codex the skill surface only", () => {
    const files = planFor("codex", "project");
    assert.ok(files.every((file) => file.kind === "skill"));
    for (const id of WORKFLOW_IDS) {
      assert.ok(files.some((f) => f.relPath === `.agents/skills/recursive-praxis-${id}/SKILL.md`));
    }
  });

  it("gives opencode the command surface only — it has no skills", () => {
    const files = planFor("opencode", "project");
    assert.ok(files.every((file) => file.kind === "command"));
    for (const id of WORKFLOW_IDS) {
      assert.ok(files.some((f) => f.relPath === `.opencode/commands/praxis-${id}.md`));
    }
  });
});

// --- global scope ----------------------------------------------------------------

describe("global-scope layouts", () => {
  it("emits a real Claude Code plugin, not loose sibling skill directories", () => {
    const files = planFor("claude", "global");
    const manifest = files.find((file) => file.kind === "manifest");
    assert.ok(manifest, "expected a plugin.json");
    assert.equal(manifest!.relPath, ".claude/skills/recursive-praxis/.claude-plugin/plugin.json");
    assert.deepEqual(JSON.parse(manifest!.content), {
      name: "recursive-praxis",
      description: "Deterministic RecursivePraxis kernel workflows driven through the `lambda` CLI.",
      version: "9.9.9",
    });

    for (const id of WORKFLOW_IDS) {
      assert.ok(
        files.some((f) => f.relPath === `.claude/skills/recursive-praxis/skills/${id}/SKILL.md`),
        `missing plugin skill for ${id}`,
      );
    }
    assert.ok(files.every((file) => file.kind !== "command"));
  });

  it("names a plugin skill after its own directory, as Claude Code requires", () => {
    const status = planFor("claude", "global").find((f) => f.relPath.endsWith("skills/status/SKILL.md"));
    assert.match(status!.content, /^---\nname: status\n/);
  });

  it("puts user-level Codex skills at ~/.agents/skills, not ~/.codex/skills", () => {
    const paths = relPaths("codex", "global");
    for (const id of WORKFLOW_IDS) {
      assert.ok(paths.includes(`.agents/skills/recursive-praxis-${id}/SKILL.md`));
    }
    assert.ok(paths.every((p) => !p.startsWith(".codex/")));
  });

  it("puts global opencode commands under ~/.config/opencode", () => {
    assert.ok(relPaths("opencode", "global").every((p) => p.startsWith(".config/opencode/commands/")));
  });

  it("reports global paths as ~/… and resolves them under home", () => {
    const file = planFor("cursor", "global")[0]!;
    assert.ok(file.displayPath.startsWith("~/"));
    assert.ok(file.absPath.startsWith(`${FAKE_HOME}${path.sep}`));
  });

  it("reports project paths relative to the project root", () => {
    const file = planFor("cursor", "project")[0]!;
    assert.equal(file.displayPath, file.relPath);
    assert.ok(file.absPath.startsWith(`${FAKE_PROJECT}${path.sep}`));
  });
});

// --- invocation ------------------------------------------------------------------

describe("invocation syntax", () => {
  it("matches the documented form per host and scope", () => {
    const claude = registry.require("claude");
    assert.equal(claude.invocation("status", "project"), "/praxis:status");
    assert.equal(claude.invocation("status", "global"), "/recursive-praxis:status");
    assert.equal(registry.require("cursor").invocation("status", "project"), "/praxis-status");
    assert.equal(registry.require("codex").invocation("status", "project"), "$recursive-praxis-status");
    assert.equal(registry.require("opencode").invocation("status", "project"), "/praxis-status");
  });
});

// --- registry and --tools --------------------------------------------------------

describe("host registry", () => {
  it("registers every declared host id, in canonical order", () => {
    assert.deepEqual(
      registry.all().map((adapter) => adapter.id),
      [...HOST_IDS],
    );
  });

  it("records the vendor release each adapter's paths were checked against", () => {
    assert.ok(registry.all().every((adapter) => adapter.verifiedAgainst.length > 0));
  });
});

describe("parseToolsValue", () => {
  it("parses a comma-separated list in canonical order", () => {
    assert.deepEqual(parseToolsValue("codex,claude"), { ok: true, tools: ["claude", "codex"] });
  });

  it("dedupes repeated tools", () => {
    assert.deepEqual(parseToolsValue("claude,claude,cursor"), { ok: true, tools: ["claude", "cursor"] });
  });

  it("expands 'all' to every host, including opencode", () => {
    const result = parseToolsValue("all");
    assert.deepEqual(result, { ok: true, tools: HOST_IDS });
    assert.ok(result.ok && result.tools.includes("opencode"));
  });

  it("resolves 'none' to an empty list", () => {
    assert.deepEqual(parseToolsValue("none"), { ok: true, tools: [] });
  });

  it("rejects an unknown tool with a clear error", () => {
    const result = parseToolsValue("claude,bogus");
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /unknown tool.*bogus/i);
  });

  it("rejects 'all' or 'none' combined with a named tool", () => {
    for (const value of ["all,claude", "none,cursor"]) {
      const result = parseToolsValue(value);
      assert.equal(result.ok, false);
      if (!result.ok) assert.match(result.error, /cannot be combined/i);
    }
  });

  it("rejects an empty value", () => {
    assert.equal(parseToolsValue("   ").ok, false);
  });
});
