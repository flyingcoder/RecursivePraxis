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
