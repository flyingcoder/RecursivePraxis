import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "vitest";
import { HostRegistry } from "../src/hosts/HostRegistry.js";
import { HOST_IDS } from "../src/hosts/types.js";
import { parseToolsValue } from "../src/hosts/tools-flag.js";
import { ASSETS } from "../src/init/registry.js";

const SLUGS = ASSETS.invocableSlugs();
import { fakeContext, FAKE_HOME, FAKE_PROJECT } from "./support/fake-host-context.js";

const registry = HostRegistry.default();
const ctx = fakeContext();

function planFor(hostId: (typeof HOST_IDS)[number], scope: "project" | "global") {
  return registry.require(hostId).plan(ASSETS, ctx, scope, { version: "9.9.9" });
}

function relPaths(hostId: (typeof HOST_IDS)[number], scope: "project" | "global"): string[] {
  return planFor(hostId, scope).map((file) => file.relPath);
}

// --- project scope: unchanged from what init has always written ------------------

describe("project-scope layouts", () => {
  it("gives Claude Code a skill and a command per slug", () => {
    const paths = relPaths("claude", "project");
    for (const id of SLUGS) {
      assert.ok(paths.includes(`.claude/skills/recursive-praxis-${id}/SKILL.md`));
      assert.ok(paths.includes(`.claude/commands/praxis/${id}.md`));
    }
  });

  it("gives Cursor a skill and a flat command per slug", () => {
    const paths = relPaths("cursor", "project");
    for (const id of SLUGS) {
      assert.ok(paths.includes(`.cursor/skills/recursive-praxis-${id}/SKILL.md`));
      assert.ok(paths.includes(`.cursor/commands/praxis-${id}.md`));
    }
  });

  it("gives Codex the skill surface plus its hook, and nothing else", () => {
    const files = planFor("codex", "project");
    assert.ok(files.every((file) => file.kind === "skill" || file.kind === "hook"));
    for (const id of SLUGS) {
      assert.ok(files.some((f) => f.relPath === `.agents/skills/recursive-praxis-${id}/SKILL.md`));
    }
    // Codex has no command or MCP surface here; the gate and inject hooks are
    // the only files of its own that live outside `.agents/`, both spliced
    // into the same hooks.json.
    assert.deepEqual(
      files.filter((f) => f.kind === "hook").map((f) => f.relPath),
      [".codex/hooks.json", ".codex/hooks.json"],
    );
  });

  it("gives opencode the command surface only — it has no skills", () => {
    const files = planFor("opencode", "project");
    assert.ok(files.every((file) => file.kind === "command"));
    for (const id of SLUGS) {
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

    for (const id of SLUGS) {
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
    for (const id of SLUGS) {
      assert.ok(paths.includes(`.agents/skills/recursive-praxis-${id}/SKILL.md`));
    }
    // `~/.codex/` is read for hooks and nothing else. A skill written there is
    // the mistake this test exists to catch, and it stays caught.
    assert.deepEqual(
      paths.filter((p) => p.startsWith(".codex/")),
      [".codex/hooks.json", ".codex/hooks.json"],
    );
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

describe("MCP server placement", () => {
  // The kernel now runs as an MCP server that ships with the plugin by
  // default, so a host given the skills without it would be taught to call
  // tools it was never handed.
  function mcpFile(hostId: (typeof HOST_IDS)[number], scope: "project" | "global") {
    return planFor(hostId, scope).find((file) => file.kind === "mcp");
  }

  it("registers the server for every host whose config the shared renderer fits", () => {
    for (const [hostId, scope, expected] of [
      ["claude", "global", ".mcp.json"],
      ["claude", "project", ".mcp.json"],
      ["cursor", "project", "mcp.json"],
      ["cursor", "global", "mcp.json"],
    ] as const) {
      const file = mcpFile(hostId, scope);
      assert.ok(file, `${hostId}/${scope} places no MCP config`);
      assert.ok(
        file.relPath.endsWith(expected),
        `${hostId}/${scope} wrote ${file.relPath}, expected to end with ${expected}`,
      );
    }
  });

  it("points every host at the same stdio server", () => {
    for (const [hostId, scope] of [
      ["claude", "global"],
      ["claude", "project"],
      ["cursor", "project"],
    ] as const) {
      const parsed = JSON.parse(mcpFile(hostId, scope)!.content);
      assert.deepEqual(parsed.mcpServers["recursive-praxis"], {
        command: "lambda",
        args: ["mcp"],
      });
    }
  });

  it("lands the plugin's config beside its manifest, where Claude Code reads it", () => {
    const plan = planFor("claude", "global");
    const manifest = plan.find((file) => file.kind === "manifest")!;
    const mcp = plan.find((file) => file.kind === "mcp")!;
    assert.equal(path.dirname(path.dirname(manifest.absPath)), path.dirname(mcp.absPath));
  });

  it("places nothing for hosts whose MCP config the shared renderer cannot produce", () => {
    // Codex keeps its servers in TOML and opencode in an `opencode.json` that
    // sits outside its layout root under a differently-shaped key. Neither is
    // `mcpServers` JSON, so both are deliberately unplaced rather than written
    // wrong; adding them needs a per-host renderer, not a table entry.
    for (const hostId of ["codex", "opencode"] as const) {
      for (const scope of ["project", "global"] as const) {
        assert.equal(mcpFile(hostId, scope), undefined, `${hostId}/${scope} placed an MCP config`);
      }
    }
  });
});

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
