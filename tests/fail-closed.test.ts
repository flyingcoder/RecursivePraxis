import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

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

test("lambda sequence diagnose fails closed without quarry output", () => {
  const result = runLambda("sequence", "diagnose", "stuck");
  assert.notEqual(result.status, 0);
  const out = combined(result);
  assert.match(out, /not implemented/i);
  assert.doesNotMatch(out, /λ_effective/);
  assert.doesNotMatch(out, /InverseSolver/i);
  assert.doesNotMatch(out, /controlled_rupture/i);
});

test("lambda sequence custom fails closed", () => {
  const result = runLambda("sequence", "custom", "Meta", "Non");
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(combined(result), /λ_effective/);
});

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

test("help names operators and check; does not claim sequence", () => {
  const result = runLambda("--help");
  assert.equal(result.status, 0);
  const out = combined(result);
  assert.match(out, /operators/);
  assert.match(out, /check/);
  for (const verb of ["record", "validate", "score", "revise"]) {
    assert.match(out, new RegExp(`${verb}.*not implemented`, "i"));
  }
  assert.doesNotMatch(out, /sequence.*(available|generate|analyze)/i);
});
