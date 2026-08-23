import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { test } from "vitest";
import os from "node:os";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const cliPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist/cli.js",
);

function runLambda(...args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
  });
}

test("lambda --help exits 0 and names reserved verbs as not implemented", () => {
  const result = runLambda("--help");
  assert.equal(result.status, 0);
  const out = `${result.stdout}${result.stderr}`;
  for (const verb of ["record", "validate", "score", "revise"]) {
    assert.match(out, new RegExp(`${verb}.*not implemented`, "i"));
  }
});

test("lambda --version exits 0 and prints a version string", () => {
  const result = runLambda("--version");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /\d+\.\d+\.\d+/);
});

test("lambda score exits non-zero and states not implemented", () => {
  const result = runLambda("score");
  assert.notEqual(result.status, 0);
  const out = `${result.stdout}${result.stderr}`;
  assert.match(out, /score is not implemented/i);
  assert.doesNotMatch(out, /λ_eff/);
  assert.doesNotMatch(out, /\b\d+\.\d+\b/);
});

test("plan emits a deterministic provider-neutral plan", () => {
  const first = runLambda("plan", "Fix", "the", "parser");
  const second = runLambda("plan", "Fix", "the", "parser");
  assert.equal(first.status, 0);
  assert.equal(first.stdout, second.stdout);
  const plan = JSON.parse(first.stdout) as { id: string; steps: unknown[] };
  assert.ok(plan.id);
  assert.ok(plan.steps.length > 0);
});

test("run, inspect, and replay form a redacted local vertical slice", () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "praxis-cli-"));
  try {
    const run = spawnSync(process.execPath, [cliPath, "run", "--host", "fake", "Handle", "private", "task"], {
      encoding: "utf8",
      cwd,
    });
    assert.equal(run.status, 0);
    const output = JSON.parse(run.stdout) as { taskId: string };
    const inspect = spawnSync(process.execPath, [cliPath, "inspect", output.taskId], {
      encoding: "utf8",
      cwd,
    });
    assert.equal(inspect.status, 0);
    assert.doesNotMatch(inspect.stdout, /Handle private task/);
    const replay = spawnSync(process.execPath, [cliPath, "replay", output.taskId], {
      encoding: "utf8",
      cwd,
    });
    assert.equal(replay.status, 0);
    assert.match(replay.stdout, /"reproducible": true/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("eval runs all benchmark domains", () => {
  const result = runLambda("eval", "--host", "fake");
  assert.equal(result.status, 0);
  for (const domain of ["software-engineering", "research-synthesis", "general-reasoning"]) {
    assert.match(result.stdout, new RegExp(domain));
  }
});

test("run defaults to the locally configured Ollama host", () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "praxis-host-"));
  try {
    mkdirSync(path.join(cwd, ".recursive-praxis"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".recursive-praxis", "config.json"),
      JSON.stringify({ ollamaBaseUrl: "http://127.0.0.1:1" }),
      "utf8",
    );

    // No --host flag: the host configured by `lambda init` is used, and an
    // unreachable local server fails closed with an actionable message.
    const run = spawnSync(process.execPath, [cliPath, "run", "Do", "the", "thing"], {
      encoding: "utf8",
      cwd,
    });

    assert.equal(run.status, 1);
    assert.match(run.stderr, /cannot reach the local Ollama server at http:\/\/127\.0\.0\.1:1/);
    assert.match(run.stderr, /ollama serve/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
