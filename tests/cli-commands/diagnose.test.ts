import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { test } from "vitest";

/**
 * `runDiagnose` and `listDiagnoseProblems` call `process.exit` directly, so they
 * are driven through the built CLI the way tests/cli.test.ts does rather than
 * imported. This closes backlog §5's "no covering tests" gap and is the
 * regression net for Phase 3's added suggested-operators line.
 */
const cliPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../dist/cli.js",
);

function runLambda(...args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: "utf8" });
}

const TEMPLATE_KEYS = [
  "stuck",
  "overwhelmed",
  "rigid",
  "collapsed",
  "procrastinating",
] as const;

test("lambda diagnose with no argument lists every template key and description", () => {
  const result = runLambda("diagnose");
  assert.equal(result.status, 0);
  for (const key of TEMPLATE_KEYS) {
    assert.match(result.stdout, new RegExp(`^${key}\\s`, "m"));
  }
});

test("lambda diagnose --json with no argument emits key/description pairs", () => {
  const result = runLambda("diagnose", "--json");
  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout) as { key: string; description: string }[];
  assert.deepEqual(
    parsed.map((entry) => entry.key),
    [...TEMPLATE_KEYS],
  );
  assert.ok(parsed.every((entry) => entry.description.length > 0));
});

for (const key of TEMPLATE_KEYS) {
  test(`lambda diagnose ${key} prints problem, diagnosis, attractor transition and sequence`, () => {
    const result = runLambda("diagnose", key);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /^problem: .+$/m);
    assert.match(result.stdout, /^diagnosis: .+$/m);
    assert.match(result.stdout, /^(J=0|S\*|∅) -> (J=0|S\*|∅)$/m);
    assert.match(result.stdout, /^(SUCCESS|PARTIAL)$/m);
    assert.match(result.stdout, /^sequence: .+$/m);
  });

  test(`lambda diagnose ${key} --json emits the documented shape`, () => {
    const result = runLambda("diagnose", key, "--json");
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.ok(parsed.problem.description.length > 0);
    assert.ok(parsed.problem.diagnosis.length > 0);
    assert.equal(typeof parsed.problem.initial.D, "number");
    assert.equal(typeof parsed.problem.target.C, "number");
    assert.ok(["J=0", "S*", "∅"].includes(parsed.initialAttractor));
    assert.ok(["J=0", "S*", "∅"].includes(parsed.targetAttractor));
    assert.ok(Array.isArray(parsed.solution.sequence));
    assert.equal(typeof parsed.solution.cost, "number");
    assert.equal(typeof parsed.solution.success, "boolean");
    assert.equal(parsed.solution.length, parsed.solution.sequence.length);
  });
}

/**
 * The attractor pairs each template exercises. Phase 3 keys its suggested-operator
 * table on exactly these; `procrastinating` is S* -> S* — target (0.25, 0.20)
 * gives V = 0.33, which is not < 0.3 — so it is the unmapped/empty case.
 */
test("the five templates cover four mapped attractor pairs plus one same-attractor pair", () => {
  const observed = TEMPLATE_KEYS.map((key) => {
    const parsed = JSON.parse(runLambda("diagnose", key, "--json").stdout);
    return `${parsed.initialAttractor}->${parsed.targetAttractor}`;
  });
  assert.deepEqual(observed, ["∅->S*", "S*->J=0", "J=0->S*", "∅->S*", "S*->S*"]);
});

test("lambda diagnose with an unknown key exits 1 and lists the available keys", () => {
  const result = runLambda("diagnose", "not-a-template");
  assert.equal(result.status, 1);
  const out = `${result.stdout}${result.stderr}`;
  assert.match(out, /unknown problem "not-a-template"/);
  for (const key of TEMPLATE_KEYS) {
    assert.match(out, new RegExp(key));
  }
});

/**
 * Phase 3.3: the suggested-operators line. The upstream CLI prints it between
 * the attractor line and the solution, and suppresses it when the list is
 * empty (controlled_rupture_cli.py:107-108).
 */
const SUGGESTIONS: Readonly<Record<string, readonly string[]>> = {
  stuck: ["Pro", "Ortho", "Weave", "Seed"],
  overwhelmed: ["Kata", "Telo", "Seed", "Latch"],
  rigid: ["Para", "Ana", "Crux", "Echo"],
  collapsed: ["Pro", "Ortho", "Weave", "Seed"],
  procrastinating: [],
};

for (const [key, ops] of Object.entries(SUGGESTIONS)) {
  test(`lambda diagnose ${key} ${ops.length ? "prints" : "suppresses"} the suggested-operators line`, () => {
    const result = runLambda("diagnose", key);
    assert.equal(result.status, 0);
    if (ops.length === 0) {
      assert.doesNotMatch(result.stdout, /Suggested operators:/);
      return;
    }
    assert.match(
      result.stdout,
      new RegExp(`^Suggested operators: ${ops.join(", ")}$`, "m"),
    );
  });

  test(`lambda diagnose ${key} --json carries the suggested field`, () => {
    const parsed = JSON.parse(runLambda("diagnose", key, "--json").stdout);
    assert.deepEqual(parsed.suggested, [...ops]);
  });
}

test("the suggested-operators line sits between the attractor line and the solution", () => {
  const lines = runLambda("diagnose", "stuck").stdout.split("\n");
  const attractorLine = lines.findIndex((line) => /^(J=0|S\*|∅) -> /.test(line));
  const suggestedLine = lines.findIndex((line) => line.startsWith("Suggested operators:"));
  const verdictLine = lines.findIndex((line) => line === "SUCCESS" || line === "PARTIAL");
  assert.ok(attractorLine >= 0 && suggestedLine >= 0 && verdictLine >= 0);
  assert.ok(attractorLine < suggestedLine, "suggestions must follow the attractor line");
  assert.ok(suggestedLine < verdictLine, "suggestions must precede the solution");
});

test("adding `suggested` did not change any pre-existing --json key", () => {
  const parsed = JSON.parse(runLambda("diagnose", "stuck", "--json").stdout);
  assert.deepEqual(Object.keys(parsed), [
    "problem",
    "initialAttractor",
    "targetAttractor",
    "suggested",
    "solution",
  ]);
  assert.deepEqual(Object.keys(parsed.solution), [
    "sequence",
    "finalState",
    "cost",
    "costBreakdown",
    "success",
    "length",
  ]);
});
