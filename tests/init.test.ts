import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { describe, it } from "vitest";
import { parseToolsValue } from "../src/init/tools-flag.js";
import { TOOL_IDS } from "../src/init/targets.js";
import { buildPlan } from "../src/init/plan.js";
import { WORKFLOW_IDS } from "../src/init/workflows.js";
import { MARKER_END, MARKER_START, hasManagedMarkers, mergeManaged, renderManagedHead } from "../src/init/managed-block.js";

const cliPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/cli.js");

function runLambda(args: string[], cwd: string) {
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: "utf8", cwd });
}

function tmpProject(): string {
  return mkdtempSync(path.join(os.tmpdir(), "praxis-init-"));
}

// --- tool parsing and validation -------------------------------------------------

describe("parseToolsValue", () => {
  it("parses a comma-separated list in canonical order", () => {
    const result = parseToolsValue("codex,claude");
    assert.deepEqual(result, { ok: true, tools: ["claude", "codex"] });
  });

  it("dedupes repeated tools", () => {
    const result = parseToolsValue("claude,claude,cursor");
    assert.deepEqual(result, { ok: true, tools: ["claude", "cursor"] });
  });

  it("expands 'all' to every tool id", () => {
    const result = parseToolsValue("all");
    assert.deepEqual(result, { ok: true, tools: TOOL_IDS });
  });

  it("resolves 'none' to an empty list", () => {
    const result = parseToolsValue("none");
    assert.deepEqual(result, { ok: true, tools: [] });
  });

  it("rejects an unknown tool with a clear error", () => {
    const result = parseToolsValue("claude,bogus");
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /unknown tool.*bogus/i);
  });

  it("rejects 'all' combined with a named tool", () => {
    const result = parseToolsValue("all,claude");
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /cannot be combined/i);
  });

  it("rejects 'none' combined with a named tool", () => {
    const result = parseToolsValue("none,cursor");
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /cannot be combined/i);
  });

  it("rejects an empty value", () => {
    const result = parseToolsValue("   ");
    assert.equal(result.ok, false);
  });
});

// --- managed markers ---------------------------------------------------------------

describe("managed markers", () => {
  it("detects both markers present", () => {
    const head = renderManagedHead("---\nname: x\n---", "body text");
    assert.ok(hasManagedMarkers(head));
    assert.ok(head.includes(MARKER_START));
    assert.ok(head.includes(MARKER_END));
  });

  it("does not treat an arbitrary file as managed", () => {
    assert.equal(hasManagedMarkers("# just a regular file\n"), false);
  });

  it("merging an unchanged file reports changed=false and round-trips byte-for-byte", () => {
    const head = renderManagedHead("---\nname: x\n---", "body text");
    const merged = mergeManaged(head, head);
    assert.equal(merged.changed, false);
    assert.equal(merged.content, head);
  });

  it("merging with a new head reports changed=true and preserves trailing user content", () => {
    const oldHead = renderManagedHead("---\nname: x\n---", "old body");
    const existing = `${oldHead}\n## user notes\nkeep me\n`;
    const newHead = renderManagedHead("---\nname: x\n---", "new body");

    const merged = mergeManaged(existing, newHead);
    assert.equal(merged.changed, true);
    assert.match(merged.content, /new body/);
    assert.doesNotMatch(merged.content, /old body/);
    assert.match(merged.content, /## user notes\nkeep me/);
  });

  it("re-merging a merged result is stable (no blank-line growth)", () => {
    const head = renderManagedHead("---\nname: x\n---", "body text");
    const existing = `${head}\n\nappendix\n`;
    const first = mergeManaged(existing, head);
    const second = mergeManaged(first.content, head);
    assert.equal(second.content, first.content);
    assert.equal(second.changed, false);
  });
});

// --- plan: every target path and invocation form ------------------------------------

describe("buildPlan", () => {
  it("produces skill + command files for claude, skill + command for cursor, skill-only for codex", () => {
    const plan = buildPlan(["claude", "cursor", "codex"]);

    for (const workflowId of WORKFLOW_IDS) {
      const claudeSkill = plan.files.find((f) => f.toolId === "claude" && f.kind === "skill" && f.workflowId === workflowId);
      assert.ok(claudeSkill);
      assert.equal(claudeSkill!.relPath, `.claude/skills/recursive-praxis-${workflowId}/SKILL.md`);

      const claudeCommand = plan.files.find((f) => f.toolId === "claude" && f.kind === "command" && f.workflowId === workflowId);
      assert.ok(claudeCommand);
      assert.equal(claudeCommand!.relPath, `.claude/commands/praxis/${workflowId}.md`);

      const cursorSkill = plan.files.find((f) => f.toolId === "cursor" && f.kind === "skill" && f.workflowId === workflowId);
      assert.equal(cursorSkill!.relPath, `.cursor/skills/recursive-praxis-${workflowId}/SKILL.md`);

      const cursorCommand = plan.files.find((f) => f.toolId === "cursor" && f.kind === "command" && f.workflowId === workflowId);
      assert.equal(cursorCommand!.relPath, `.cursor/commands/praxis-${workflowId}.md`);

      const codexSkill = plan.files.find((f) => f.toolId === "codex" && f.kind === "skill" && f.workflowId === workflowId);
      assert.equal(codexSkill!.relPath, `.agents/skills/recursive-praxis-${workflowId}/SKILL.md`);

      const codexCommand = plan.files.find((f) => f.toolId === "codex" && f.kind === "command" && f.workflowId === workflowId);
      assert.equal(codexCommand, undefined);
    }
  });

  it("emits the documented invocation syntax per host", () => {
    const plan = buildPlan(["claude", "cursor", "codex"]);
    const byTool = Object.fromEntries(plan.hosts.map((h) => [h.toolId, h.invocations]));

    assert.equal(byTool.claude!.find((i) => i.workflowId === "status")!.invocation, "/praxis:status");
    assert.equal(byTool.claude!.find((i) => i.workflowId === "analyze")!.invocation, "/praxis:analyze");
    assert.equal(byTool.cursor!.find((i) => i.workflowId === "status")!.invocation, "/praxis-status");
    assert.equal(byTool.cursor!.find((i) => i.workflowId === "analyze")!.invocation, "/praxis-analyze");
    assert.equal(byTool.codex!.find((i) => i.workflowId === "status")!.invocation, "$recursive-praxis-status");
    assert.equal(byTool.codex!.find((i) => i.workflowId === "analyze")!.invocation, "$recursive-praxis-analyze");
  });

  it("produces no files when given an empty tool list", () => {
    const plan = buildPlan([]);
    assert.equal(plan.files.length, 0);
    assert.equal(plan.hosts.length, 0);
  });
});

// --- generated managed markers (via the real CLI) ------------------------------------

describe("lambda init: generated managed markers", () => {
  it("every generated file carries the RecursivePraxis managed markers", () => {
    const cwd = tmpProject();
    try {
      const result = runLambda(["init", "--tools", "all"], cwd);
      assert.equal(result.status, 0);
      const skillFile = readFileSync(path.join(cwd, ".claude/skills/recursive-praxis-status/SKILL.md"), "utf8");
      assert.ok(hasManagedMarkers(skillFile));
      assert.match(skillFile, /^---\n/);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

// --- idempotent re-run behavior -------------------------------------------------------

describe("lambda init: idempotent re-run", () => {
  it("a second run with no changes reports everything as preserved, not refreshed", () => {
    const cwd = tmpProject();
    try {
      const first = runLambda(["init", "--tools", "claude", "--json"], cwd);
      assert.equal(first.status, 0);
      const firstSummary = JSON.parse(first.stdout) as { files: { action: string }[] };
      assert.ok(firstSummary.files.every((f) => f.action === "created"));

      const second = runLambda(["init", "--tools", "claude", "--json"], cwd);
      assert.equal(second.status, 0);
      const secondSummary = JSON.parse(second.stdout) as { files: { action: string }[] };
      assert.ok(secondSummary.files.every((f) => f.action === "preserved"));
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("running repeatedly does not grow the file or change its bytes", () => {
    const cwd = tmpProject();
    try {
      runLambda(["init", "--tools", "claude"], cwd);
      const target = path.join(cwd, ".claude/skills/recursive-praxis-status/SKILL.md");
      const after1 = readFileSync(target, "utf8");
      runLambda(["init", "--tools", "claude"], cwd);
      runLambda(["init", "--tools", "claude"], cwd);
      const after3 = readFileSync(target, "utf8");
      assert.equal(after3, after1);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

// --- preservation of user content outside markers ---------------------------------------

describe("lambda init: preserves user-authored content", () => {
  it("keeps content appended after the END marker across a re-run", () => {
    const cwd = tmpProject();
    try {
      runLambda(["init", "--tools", "claude"], cwd);
      const target = path.join(cwd, ".claude/skills/recursive-praxis-status/SKILL.md");
      appendFileSync(target, "\n\n## Team notes\nDo not remove this section.\n");

      const result = runLambda(["init", "--tools", "claude", "--json"], cwd);
      assert.equal(result.status, 0);
      const content = readFileSync(target, "utf8");
      assert.match(content, /## Team notes\nDo not remove this section\./);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("never overwrites a pre-existing file lacking the managed markers", () => {
    const cwd = tmpProject();
    try {
      const dir = path.join(cwd, ".claude/skills/recursive-praxis-status");
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, "SKILL.md"), "hand-authored, not RecursivePraxis-managed\n", "utf8");

      const result = runLambda(["init", "--tools", "claude", "--json"], cwd);
      assert.equal(result.status, 0);
      const summary = JSON.parse(result.stdout) as { files: { relPath: string; action: string }[] };
      const entry = summary.files.find((f) => f.relPath.endsWith("recursive-praxis-status/SKILL.md"));
      assert.equal(entry?.action, "skipped");
      assert.equal(readFileSync(path.join(dir, "SKILL.md"), "utf8"), "hand-authored, not RecursivePraxis-managed\n");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

// --- --tools none -------------------------------------------------------------------

describe("lambda init --tools none", () => {
  it("exits 0 and writes nothing", () => {
    const cwd = tmpProject();
    try {
      const result = runLambda(["init", "--tools", "none"], cwd);
      assert.equal(result.status, 0);
      assert.doesNotMatch(result.stdout, /created:/);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("--tools none via JSON reports empty tools and files arrays", () => {
    const cwd = tmpProject();
    try {
      const result = runLambda(["init", "--tools", "none", "--json"], cwd);
      assert.equal(result.status, 0);
      const summary = JSON.parse(result.stdout) as { tools: unknown[]; files: unknown[] };
      assert.deepEqual(summary.tools, []);
      assert.deepEqual(summary.files, []);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

// --- missing/invalid --tools ---------------------------------------------------------

describe("lambda init: argument errors", () => {
  it("fails clearly when --tools is omitted", () => {
    const cwd = tmpProject();
    try {
      const result = runLambda(["init"], cwd);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /requires --tools/i);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("fails clearly for an unknown tool", () => {
    const cwd = tmpProject();
    try {
      const result = runLambda(["init", "--tools", "vscode"], cwd);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /unknown tool/i);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

// --- no generated delivery/OpenSpec artifacts -----------------------------------------

describe("lambda init: no delivery-system or OpenSpec artifacts", () => {
  it("never generates an openspec/ directory or opsx-* files", () => {
    const cwd = tmpProject();
    try {
      const result = runLambda(["init", "--tools", "all", "--json"], cwd);
      assert.equal(result.status, 0);
      const summary = JSON.parse(result.stdout) as { files: { relPath: string }[] };
      for (const file of summary.files) {
        assert.doesNotMatch(file.relPath, /openspec/i);
        assert.doesNotMatch(file.relPath, /opsx-/i);
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("never suggests `lambda run` as a default workflow step in generated content", () => {
    const cwd = tmpProject();
    try {
      runLambda(["init", "--tools", "all"], cwd);
      for (const workflowId of WORKFLOW_IDS) {
        const content = readFileSync(path.join(cwd, `.claude/skills/recursive-praxis-${workflowId}/SKILL.md`), "utf8");
        assert.doesNotMatch(content, /^\s*lambda run\b/m);
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

describe("lambda --help mentions init", () => {
  it("documents the init command", () => {
    const cwd = tmpProject();
    try {
      const result = runLambda(["--help"], cwd);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /lambda init --tools/);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

// --- init as the configuration surface -------------------------------------------

describe("lambda init configuration", () => {
  it("writes the chosen host and model to .recursive-praxis/config.json", () => {
    const cwd = tmpProject();
    const result = runLambda(["init", "--tools", "none", "--host", "ollama", "--model", "qwen3"], cwd);

    assert.equal(result.status, 0);
    const written = JSON.parse(
      readFileSync(path.join(cwd, ".recursive-praxis", "config.json"), "utf8"),
    ) as Record<string, string>;
    assert.deepEqual(written, { defaultHost: "ollama", ollamaModel: "qwen3" });
  });

  it("reports local Ollama defaults without writing when no config flag is passed", () => {
    const cwd = tmpProject();
    const result = runLambda(["init", "--tools", "none", "--json"], cwd);
    const payload = JSON.parse(result.stdout) as {
      config: { settings: Record<string, string>; sources: Record<string, string>; written: boolean };
    };

    assert.equal(payload.config.written, false);
    assert.equal(payload.config.settings.defaultHost, "ollama");
    assert.equal(payload.config.settings.ollamaBaseUrl, "http://127.0.0.1:11434");
    assert.equal(payload.config.sources.defaultHost, "default");
    assert.equal(existsSync(path.join(cwd, ".recursive-praxis", "config.json")), false);
  });

  it("keeps earlier choices when a later init changes only one setting", () => {
    const cwd = tmpProject();
    runLambda(["init", "--tools", "none", "--ollama-url", "http://127.0.0.1:9999"], cwd);
    runLambda(["init", "--tools", "none", "--model", "qwen3"], cwd);

    const written = JSON.parse(
      readFileSync(path.join(cwd, ".recursive-praxis", "config.json"), "utf8"),
    ) as Record<string, string>;
    assert.deepEqual(written, { ollamaBaseUrl: "http://127.0.0.1:9999", ollamaModel: "qwen3" });
  });

  it("rejects an unknown host without writing a config file", () => {
    const cwd = tmpProject();
    const result = runLambda(["init", "--tools", "none", "--host", "gpt"], cwd);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /unknown host: gpt/);
    assert.equal(existsSync(path.join(cwd, ".recursive-praxis", "config.json")), false);
  });

  it("rejects an invalid ollama url without writing a config file", () => {
    const cwd = tmpProject();
    const result = runLambda(["init", "--tools", "none", "--ollama-url", "nope"], cwd);

    assert.equal(result.status, 1);
    assert.equal(existsSync(path.join(cwd, ".recursive-praxis", "config.json")), false);
  });

  it("still requires --tools", () => {
    const result = runLambda(["init", "--host", "ollama"], tmpProject());
    assert.equal(result.status, 1);
    assert.match(result.stderr, /requires --tools/);
  });
});
