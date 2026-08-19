import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const cliPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist/cli.js",
);

const CORE_OPS = [
  "Kata",
  "Telo",
  "Ortho",
  "Pro",
  "Latch",
  "Ana",
  "Para",
  "Non",
  "Fold",
  "Flux",
  "Meta",
  "Retro",
  "Echo",
  "Braid",
  "Seed",
  "Crux",
  "Weave",
  "Bind",
  "Axis",
  "Vale",
] as const;

function runLambda(...args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
  });
}

function combined(result: ReturnType<typeof runLambda>): string {
  return `${result.stdout}${result.stderr}`;
}

test("operators list exits 0 and names all twenty CORE operators", () => {
  const result = runLambda("operators", "list");
  assert.equal(result.status, 0);
  const out = combined(result);
  for (const name of CORE_OPS) {
    assert.match(out, new RegExp(`\\b${name}\\b`));
  }
  assert.doesNotMatch(out, /λ_effective/);
  assert.doesNotMatch(out, /cost breakdown/i);
});

test("operators show Ana exits 0 with class and authored λ", () => {
  const result = runLambda("operators", "show", "Ana");
  assert.equal(result.status, 0);
  const out = combined(result);
  assert.match(out, /\bAna\b/);
  assert.match(out, /Disruptive/);
  assert.match(out, /authored/i);
});

test("operators show unknown exits non-zero", () => {
  const result = runLambda("operators", "show", "NotAnOp");
  assert.notEqual(result.status, 0);
  assert.match(combined(result), /unknown/i);
});

test("check rejects Meta then Non", () => {
  const result = runLambda("check", "Meta", "Non");
  assert.notEqual(result.status, 0);
  const out = combined(result);
  assert.match(out, /reject/i);
  assert.match(out, /Non.*Meta|after Meta/i);
  assert.doesNotMatch(out, /\bwarning\b/i);
});

test("check accepts Kata Weave Latch", () => {
  const result = runLambda("check", "Kata", "Weave", "Latch");
  assert.equal(result.status, 0);
  assert.match(combined(result), /accept/i);
});

test("check rejects ending on Ana", () => {
  const result = runLambda("check", "Ana");
  assert.notEqual(result.status, 0);
  assert.match(combined(result), /reject/i);
  assert.match(combined(result), /Ana/);
});

test("check rejects Vale without stabilizer", () => {
  const result = runLambda("check", "Vale");
  assert.notEqual(result.status, 0);
  const out = combined(result);
  assert.match(out, /reject/i);
  assert.match(out, /Vale/);
  assert.match(out, /stabilizer/i);
});
