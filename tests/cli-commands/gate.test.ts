import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { test } from "vitest";

/**
 * `runGate` reads a PreToolUse hook payload from stdin and exits 0 (allow) or
 * 2 (block), so it is driven through the built CLI with `spawnSync`'s `input`
 * option rather than imported directly.
 */
const cliPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../dist/cli.js",
);

function runLambda(cwd: string, ...args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: "utf8", cwd });
}

function runGate(cwd: string, payload: unknown) {
  return spawnSync(process.execPath, [cliPath, "gate"], {
    encoding: "utf8",
    cwd,
    input: JSON.stringify(payload),
  });
}

function withTempSession(fn: (cwd: string) => void): void {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "praxis-gate-"));
  try {
    fn(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test("gate allows a shell call that is not `lambda step`", () => {
  withTempSession((cwd) => {
    const result = runGate(cwd, { tool_input: { command: "ls -la" } });
    assert.equal(result.status, 0);
  });
});

test("gate allows a `lambda step --op` naming a legal operator", () => {
  withTempSession((cwd) => {
    const result = runGate(cwd, { tool_input: { command: "lambda step --op Meta" } });
    assert.equal(result.status, 0);
  });
});

test("gate blocks Non immediately after Meta", () => {
  withTempSession((cwd) => {
    assert.equal(runLambda(cwd, "step", "--op", "Meta").status, 0);
    const result = runGate(cwd, { tool_input: { command: "lambda step --op Non" } });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /legality-gate: Non is not in legalNext/);
    assert.match(result.stderr, /Legal now:/);
  });
});

test("gate blocks a third consecutive Meta", () => {
  withTempSession((cwd) => {
    assert.equal(runLambda(cwd, "step", "--op", "Meta").status, 0);
    assert.equal(runLambda(cwd, "step", "--op", "Meta").status, 0);
    const result = runGate(cwd, { tool_input: { command: "lambda step --op Meta" } });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /legality-gate: Meta is not in legalNext/);
  });
});

test("gate blocks any step once the session is bound", () => {
  withTempSession((cwd) => {
    mkdirSync(path.join(cwd, ".recursive-praxis"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".recursive-praxis", "session.json"),
      JSON.stringify({
        sequence: [],
        state: { D: 0, C: 0 },
        mode: 1,
        haliraStep: 0,
        mode1FailureCount: 0,
        anomalyArtifact: null,
        metaUsedInStep3: false,
        orthoUsedInStep6: false,
        bound: true,
      }),
      "utf8",
    );
    const result = runGate(cwd, { tool_input: { command: "lambda step --op Telo" } });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /legality-gate: session already bound/);
  });
});

test("gate allows an unrecognized operator name (lambda step's own parser rejects it)", () => {
  withTempSession((cwd) => {
    const result = runGate(cwd, { tool_input: { command: "lambda step --op NotAnOperator" } });
    assert.equal(result.status, 0);
  });
});

test("gate fails open on a payload it cannot parse", () => {
  withTempSession((cwd) => {
    const result = spawnSync(process.execPath, [cliPath, "gate"], {
      encoding: "utf8",
      cwd,
      input: "not json",
    });
    assert.equal(result.status, 0);
  });
});

// --- the second payload shape, which Cursor sends ---------------------------------

/**
 * Cursor's `beforeShellExecution` carries the command at the root of the
 * payload rather than under `tool_input`. These repeat the two decisive cases
 * in that shape, because a gate that silently ignored it would be installed,
 * enabled, and useless — allowing every step through while looking healthy.
 */
test("gate blocks an illegal step from Cursor's root-level `command` payload", () => {
  withTempSession((cwd) => {
    assert.equal(runLambda(cwd, "step", "--op", "Meta").status, 0);
    const result = runGate(cwd, {
      command: "lambda step --op Non",
      cwd,
      hook_event_name: "beforeShellExecution",
    });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /legality-gate: Non is not in legalNext/);
  });
});

test("gate allows a legal step from Cursor's root-level `command` payload", () => {
  withTempSession((cwd) => {
    const result = runGate(cwd, {
      command: "lambda step --op Meta",
      cwd,
      hook_event_name: "beforeShellExecution",
    });
    assert.equal(result.status, 0);
  });
});

test("gate prefers tool_input.command when a payload somehow carries both", () => {
  withTempSession((cwd) => {
    assert.equal(runLambda(cwd, "step", "--op", "Meta").status, 0);
    const result = runGate(cwd, {
      tool_input: { command: "lambda step --op Non" },
      command: "ls -la",
    });
    assert.equal(result.status, 2);
  });
});
