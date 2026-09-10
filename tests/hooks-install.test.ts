import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { describe, it } from "vitest";
import { HostRegistry } from "../src/hosts/HostRegistry.js";
import type { PlannedFile } from "../src/hosts/HostAdapter.js";
import { ASSETS } from "../src/init/registry.js";
import { applyFragment, removeFragment } from "../src/init/json-fragment.js";
import type { Scope } from "../src/hosts/types.js";
import { fakeContext, FAKE_HOME, FAKE_PROJECT } from "./support/fake-host-context.js";

/**
 * Installing the legality gate as a real host hook.
 *
 * The gate command itself is covered in tests/cli-commands/gate.test.ts; what
 * is asserted here is the other half — that `lambda init` actually writes a
 * config a host will load it from, and that writing it into a file the user
 * co-owns neither loses their content nor accumulates duplicates.
 */

const registry = HostRegistry.default();
const ctx = fakeContext();
const cliPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/cli.js");

/** The one shape both scopes have to produce, whatever file it lands in. */
const GATE_ENTRY = {
  matcher: "Bash",
  hooks: [{ type: "command", command: "lambda gate" }],
};

function planFor(scope: Scope): readonly PlannedFile[] {
  return registry.require("claude").plan(ASSETS, ctx, scope, { version: "9.9.9" });
}

function hookFiles(scope: Scope): readonly PlannedFile[] {
  return planFor(scope).filter((file) => file.kind === "hook");
}

function withTempProject(fn: (cwd: string) => void): void {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "praxis-hooks-"));
  try {
    fn(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function runLambda(cwd: string, ...args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: "utf8", cwd });
}

function readJson(absPath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(absPath, "utf8")) as Record<string, unknown>;
}

// --- what each scope plans -------------------------------------------------------

describe("Claude Code hook placement", () => {
  it("plans the plugin's own hooks/hooks.json at global scope", () => {
    const files = hookFiles("global");
    assert.equal(files.length, 1);
    const file = files[0];
    assert.ok(file !== undefined);
    assert.equal(file.relPath, ".claude/skills/recursive-praxis/hooks/hooks.json");
    // A file inside our plugin is ours outright, so it is written whole.
    assert.equal(file.fragment, undefined);
    assert.deepEqual(JSON.parse(file.content), { hooks: { PreToolUse: [GATE_ENTRY] } });
  });

  it("plans a spliced entry into the user's .claude/settings.json at project scope", () => {
    const files = hookFiles("project");
    assert.equal(files.length, 1);
    const file = files[0];
    assert.ok(file !== undefined);
    assert.equal(file.absPath, path.join(FAKE_PROJECT, ".claude", "settings.json"));
    // Their settings file, so an append — never a whole-file write.
    assert.equal(file.fragment?.merge, "append");
    assert.deepEqual(file.fragment?.pointer, ["hooks", "PreToolUse"]);
    assert.deepEqual(file.fragment?.value, GATE_ENTRY);
  });

});

// --- Codex CLI: the same vocabulary, its own file --------------------------------

describe("Codex CLI hook placement", () => {
  function codexHooks(scope: Scope): readonly PlannedFile[] {
    return registry
      .require("codex")
      .plan(ASSETS, ctx, scope, { version: "9.9.9" })
      .filter((file) => file.kind === "hook");
  }

  it("splices the Claude-shaped entry into .codex/hooks.json, outside the .agents root", () => {
    for (const [scope, root] of [
      ["project", FAKE_PROJECT],
      ["global", FAKE_HOME],
    ] as const) {
      const files = codexHooks(scope);
      assert.equal(files.length, 1, `${scope} planned ${files.length} hook files`);
      const file = files[0];
      assert.ok(file !== undefined);
      assert.equal(file.absPath, path.join(root, ".codex", "hooks.json"));
      // Codex agrees with Claude Code name for name, so it renders identically.
      assert.equal(file.fragment?.merge, "append");
      assert.deepEqual(file.fragment?.pointer, ["hooks", "PreToolUse"]);
      assert.deepEqual(file.fragment?.value, GATE_ENTRY);
    }
  });
});

// --- Cursor: its own vocabulary and its own entry shape --------------------------

describe("Cursor hook placement", () => {
  function cursorHooks(scope: Scope): readonly PlannedFile[] {
    return registry
      .require("cursor")
      .plan(ASSETS, ctx, scope, { version: "9.9.9" })
      .filter((file) => file.kind === "hook");
  }

  it("renders Cursor's flat beforeShellExecution entry, not the matcher-group shape", () => {
    const files = cursorHooks("project");
    const entry = files.find((file) => file.fragment?.merge === "append");
    assert.ok(entry !== undefined);
    assert.equal(entry.absPath, path.join(FAKE_PROJECT, ".cursor", "hooks.json"));
    assert.deepEqual(entry.fragment?.pointer, ["hooks", "beforeShellExecution"]);
    assert.deepEqual(entry.fragment?.value, {
      type: "command",
      command: "lambda gate",
      // A tool-name matcher would be meaningless to Cursor, which tests the
      // matcher against the command line.
      matcher: "lambda",
    });
  });

  it("ensures the schema version alongside the entry, and writes it first", () => {
    const files = cursorHooks("project");
    assert.equal(files.length, 2);
    const [first, second] = files;
    assert.equal(first?.fragment?.merge, "ensure");
    assert.deepEqual(first?.fragment?.pointer, ["version"]);
    assert.equal(first?.fragment?.value, 1);
    assert.equal(second?.fragment?.merge, "append");
  });

  it("leaves a version the user already set, and never removes it", () => {
    const version = cursorHooks("project").find((file) => file.fragment?.merge === "ensure");
    assert.ok(version?.fragment !== undefined);

    // A newer schema version is the host's business, not ours to downgrade.
    const theirs = `${JSON.stringify({ version: 2, hooks: {} }, null, 2)}\n`;
    assert.equal(applyFragment(theirs, version.fragment).kind, "unchanged");

    // And an uninstall that removed it would break whatever hooks of theirs we
    // deliberately left behind.
    assert.equal(removeFragment(theirs, version.fragment).kind, "unchanged");
  });

  it("writes a file Cursor would accept, from nothing", () => {
    let document: string | null = null;
    for (const file of cursorHooks("project")) {
      assert.ok(file.fragment !== undefined);
      const outcome = applyFragment(document, file.fragment);
      if (outcome.kind !== "updated") assert.fail(`expected a write, got ${outcome.kind}`);
      document = outcome.text;
    }
    assert.ok(document !== null);
    assert.deepEqual(JSON.parse(document), {
      version: 1,
      hooks: {
        beforeShellExecution: [{ type: "command", command: "lambda gate", matcher: "lambda" }],
      },
    });
  });

  it("plans a hook at global scope too, under the home .cursor", () => {
    const entry = cursorHooks("global").find((file) => file.fragment?.merge === "append");
    assert.ok(entry !== undefined);
    assert.equal(entry.absPath, path.join(FAKE_HOME, ".cursor", "hooks.json"));
  });
});

// --- the host whose hook surface is not a config file at all ---------------------

describe("opencode", () => {
  it("plans no hook: its hooks are JavaScript plugin modules, not config entries", () => {
    for (const scope of ["project", "global"] as const) {
      const planned = registry
        .require("opencode")
        .plan(ASSETS, ctx, scope, { version: "9.9.9" })
        .filter((file) => file.kind === "hook");
      assert.deepEqual(planned, [], `opencode/${scope} planned a hook it has no config surface for`);
    }
  });
});

// --- splicing into a file the user owns ------------------------------------------

describe("appending a hook to a shared settings.json", () => {
  const fragment = {
    merge: "append",
    pointer: ["hooks", "PreToolUse"],
    value: GATE_ENTRY,
  } as const;

  const theirs = {
    matcher: "Write",
    hooks: [{ type: "command", command: "./scripts/format.sh" }],
  };

  const existing = `${JSON.stringify(
    {
      permissions: { allow: ["Bash(npm run test)"] },
      hooks: { PreToolUse: [theirs] },
    },
    null,
    2,
  )}\n`;

  it("keeps unrelated settings and the user's own hook", () => {
    const outcome = applyFragment(existing, fragment);
    if (outcome.kind !== "updated") assert.fail(`expected a write, got ${outcome.kind}`);

    const document = JSON.parse(outcome.text) as Record<string, unknown>;
    assert.deepEqual(document.permissions, { allow: ["Bash(npm run test)"] });
    assert.deepEqual(document.hooks, { PreToolUse: [theirs, GATE_ENTRY] });
  });

  it("does not duplicate the entry when applied a second time", () => {
    const first = applyFragment(existing, fragment);
    if (first.kind !== "updated") assert.fail("expected a write");
    const second = applyFragment(first.text, fragment);
    assert.equal(second.kind, "unchanged");
    assert.equal(second.text, first.text);
  });

  it("creates the whole document when the file does not exist yet", () => {
    const outcome = applyFragment(null, fragment);
    if (outcome.kind !== "updated") assert.fail("expected a write");
    assert.deepEqual(JSON.parse(outcome.text), { hooks: { PreToolUse: [GATE_ENTRY] } });
  });

  it("removes only our entry, leaving the user's hook and their settings", () => {
    const installed = applyFragment(existing, fragment);
    if (installed.kind !== "updated") assert.fail("expected a write");

    const removed = removeFragment(installed.text, fragment);
    if (removed.kind !== "updated") assert.fail("expected a write");
    assert.equal(removed.text, existing);
  });

  it("prunes the event and the hooks container when nothing of theirs is left", () => {
    const onlyOurs = `${JSON.stringify({ model: "opus" }, null, 2)}\n`;
    const installed = applyFragment(onlyOurs, fragment);
    if (installed.kind !== "updated") assert.fail("expected a write");

    const removed = removeFragment(installed.text, fragment);
    if (removed.kind !== "updated") assert.fail("expected a write");
    assert.deepEqual(JSON.parse(removed.text), { model: "opus" });
  });

  it("refuses a file whose hooks key is not the shape we understand", () => {
    const wrongShape = `${JSON.stringify({ hooks: { PreToolUse: "./hook.sh" } }, null, 2)}\n`;
    assert.equal(applyFragment(wrongShape, fragment).kind, "unparseable");
    assert.equal(applyFragment("{ not json", fragment).kind, "unparseable");
  });
});

// --- end to end, through the built CLI --------------------------------------------

describe("lambda init --tools claude installs the gate", () => {
  it("writes a PreToolUse Bash entry running `lambda gate` verbatim", () => {
    withTempProject((cwd) => {
      assert.equal(runLambda(cwd, "init", "--tools", "claude").status, 0);

      const settings = readJson(path.join(cwd, ".claude", "settings.json"));
      assert.deepEqual(settings.hooks, { PreToolUse: [GATE_ENTRY] });
    });
  });

  it("leaves a hand-authored settings.json intact and does not duplicate on re-run", () => {
    withTempProject((cwd) => {
      const settingsPath = path.join(cwd, ".claude", "settings.json");
      const theirs = {
        matcher: "Write",
        hooks: [{ type: "command", command: "./scripts/format.sh" }],
      };
      mkdirSync(path.dirname(settingsPath), { recursive: true });
      writeFileSync(
        settingsPath,
        `${JSON.stringify(
          {
            model: "opus",
            permissions: { allow: ["Bash(npm run test)"] },
            hooks: { PostToolUse: [theirs] },
          },
          null,
          2,
        )}\n`,
        "utf8",
      );

      assert.equal(runLambda(cwd, "init", "--tools", "claude").status, 0);

      const after = readJson(settingsPath);
      assert.equal(after.model, "opus");
      assert.deepEqual(after.permissions, { allow: ["Bash(npm run test)"] });
      assert.deepEqual(after.hooks, { PostToolUse: [theirs], PreToolUse: [GATE_ENTRY] });

      const second = runLambda(cwd, "init", "--tools", "claude", "--json");
      assert.equal(second.status, 0);
      const summary = JSON.parse(second.stdout) as { files: { relPath: string; action: string }[] };
      const entry = summary.files.find((f) => f.relPath === ".claude/settings.json");
      assert.equal(entry?.action, "preserved");
      assert.deepEqual(readJson(settingsPath), after);
    });
  });

  it("installs the gate for Codex CLI and Cursor in each host's own dialect", () => {
    withTempProject((cwd) => {
      assert.equal(runLambda(cwd, "init", "--tools", "codex,cursor").status, 0);

      assert.deepEqual(readJson(path.join(cwd, ".codex", "hooks.json")), {
        hooks: { PreToolUse: [GATE_ENTRY] },
      });
      assert.deepEqual(readJson(path.join(cwd, ".cursor", "hooks.json")), {
        version: 1,
        hooks: {
          beforeShellExecution: [{ type: "command", command: "lambda gate", matcher: "lambda" }],
        },
      });
    });
  });

  it("re-running reports every host's spliced hook as preserved, not drifted", () => {
    withTempProject((cwd) => {
      assert.equal(runLambda(cwd, "init", "--tools", "all").status, 0);

      const second = runLambda(cwd, "init", "--tools", "all", "--json");
      assert.equal(second.status, 0);
      const summary = JSON.parse(second.stdout) as { files: { relPath: string; action: string }[] };
      for (const relPath of [
        ".claude/settings.json",
        ".codex/hooks.json",
        ".cursor/hooks.json",
      ]) {
        const entries = summary.files.filter((f) => f.relPath === relPath);
        assert.ok(entries.length > 0, `${relPath} was not planned`);
        for (const entry of entries) {
          assert.equal(entry.action, "preserved", `${relPath} was rewritten on a no-op re-run`);
        }
      }
    });
  });

  it("leaves a hand-authored hooks.json for Cursor and Codex intact through uninstall", () => {
    withTempProject((cwd) => {
      const cursorPath = path.join(cwd, ".cursor", "hooks.json");
      const codexPath = path.join(cwd, ".codex", "hooks.json");
      const theirCursor = { version: 1, hooks: { afterFileEdit: [{ command: "./fmt.sh" }] } };
      const theirCodex = {
        hooks: { SessionStart: [{ hooks: [{ type: "command", command: "./hi.sh" }] }] },
      };
      for (const [file, body] of [
        [cursorPath, theirCursor],
        [codexPath, theirCodex],
      ] as const) {
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, `${JSON.stringify(body, null, 2)}\n`, "utf8");
      }

      assert.equal(runLambda(cwd, "init", "--tools", "cursor,codex").status, 0);
      assert.equal(runLambda(cwd, "uninstall", "--yes").status, 0);

      // Byte-for-byte what they wrote — including Cursor's `version`, which we
      // needed but never owned.
      assert.deepEqual(readJson(cursorPath), theirCursor);
      assert.deepEqual(readJson(codexPath), theirCodex);
    });
  });

  it("reports no drift from doctor after a fresh install", () => {
    withTempProject((cwd) => {
      assert.equal(runLambda(cwd, "init", "--tools", "all").status, 0);
      // Cursor's `version` key and its hook entry share one file. A doctor that
      // identified a spliced entry by path alone would check one against the
      // other and report permanent drift on a install it had just written.
      const doctor = runLambda(cwd, "doctor");
      assert.equal(doctor.status, 0, doctor.stdout + doctor.stderr);
    });
  });

  it("installs a gate the built CLI actually honours", () => {
    withTempProject((cwd) => {
      assert.equal(runLambda(cwd, "init", "--tools", "claude").status, 0);

      // Read the command back out of the generated config rather than hard-coding
      // it, so this exercises the string a host would really run.
      const settings = readJson(path.join(cwd, ".claude", "settings.json"));
      const hooks = settings.hooks as { PreToolUse: { hooks: { command: string }[] }[] };
      const first = hooks.PreToolUse[0]?.hooks[0];
      assert.ok(first !== undefined);
      const [binary, ...args] = first.command.split(" ");
      assert.equal(binary, "lambda");

      const gate = spawnSync(process.execPath, [cliPath, ...args], {
        encoding: "utf8",
        cwd,
        input: JSON.stringify({ tool_input: { command: "ls -la" } }),
      });
      assert.equal(gate.status, 0);
    });
  });
});
