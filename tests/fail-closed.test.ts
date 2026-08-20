import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { test } from "vitest";

const cliPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist/cli.js",
);

function runLambda(...args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
  });
}

function combined(result: ReturnType<typeof runLambda>): string {
  return `${result.stdout}${result.stderr}`;
}

test("reserved Praxis verbs remain unimplemented without scores", () => {
  for (const verb of ["record", "validate", "score", "revise"]) {
    const result = runLambda(verb);
    assert.notEqual(result.status, 0, verb);
    const out = combined(result);
    assert.match(out, new RegExp(`${verb} is not implemented`, "i"));
    assert.doesNotMatch(out, /λ_eff/);
    assert.doesNotMatch(out, /λ_effective/);
  }
});

test("help names operators, check, and the ported kernel command surface", () => {
  const result = runLambda("--help");
  assert.equal(result.status, 0);
  const out = combined(result);
  assert.match(out, /operators/);
  assert.match(out, /check/);
  for (const verb of ["record", "validate", "score", "revise"]) {
    assert.match(out, new RegExp(`${verb}.*not implemented`, "i"));
  }
  for (const command of ["status", "sense", "step", "analyze", "solve", "diagnose", "halira", "bind", "ir"]) {
    assert.match(out, new RegExp(`\\b${command}\\b`, "i"));
  }
});

test("unknown top-level command still fails closed", () => {
  const result = runLambda("sequence");
  assert.notEqual(result.status, 0);
  assert.match(combined(result), /unknown command/i);
});

test("lambda analyze is a trusted first-party kernel surface, never proxying the quarry", () => {
  const result = runLambda("analyze", "Kata,Weave,Latch");
  assert.equal(result.status, 0);
  const out = combined(result);
  assert.match(out, /lambda_eff/);
  assert.doesNotMatch(out, /InverseSolver/i);
  assert.doesNotMatch(out, /controlled_rupture/i);
});
