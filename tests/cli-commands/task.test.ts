import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { test } from "vitest";

/**
 * `runTask` and `listTaskTemplates` call `process.exit` directly, so they are
 * driven through the built CLI the way tests/cli-commands/diagnose.test.ts
 * does rather than imported.
 */
const cliPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../dist/cli.js",
);

function runLambda(...args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: "utf8" });
}

const TEMPLATE_KEYS = [
  "git-commit",
  "documentation",
  "meta-prompting",
  "mindset",
  "code-review",
] as const;

test("lambda task with no argument lists every template key and description", () => {
  const result = runLambda("task");
  assert.equal(result.status, 0);
  for (const key of TEMPLATE_KEYS) {
    assert.match(result.stdout, new RegExp(`^${key}\\s`, "m"));
  }
});

test("lambda task --json with no argument emits key/description pairs", () => {
  const result = runLambda("task", "--json");
  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout) as { key: string; description: string }[];
  assert.deepEqual(
    parsed.map((entry) => entry.key),
    [...TEMPLATE_KEYS],
  );
  assert.ok(parsed.every((entry) => entry.description.length > 0));
});

for (const key of TEMPLATE_KEYS) {
  test(`lambda task ${key} prints task, diagnosis, attractor transition and sequence`, () => {
    const result = runLambda("task", key);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /^task: .+$/m);
    assert.match(result.stdout, /^rationale: .+$/m);
    assert.match(result.stdout, /^(J=0|S\*|∅) -> (J=0|S\*|∅)$/m);
    assert.match(result.stdout, /^(SUCCESS|PARTIAL)$/m);
    assert.match(result.stdout, /^sequence: .+$/m);
  });

  test(`lambda task ${key} --json emits the documented shape`, () => {
    const result = runLambda("task", key, "--json");
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.ok(parsed.problem.description.length > 0);
    assert.ok(parsed.problem.rationale.length > 0);
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
 * Each template's authored attractor pair. Every key here is mapped in
 * TRANSITION_SUGGESTIONS (src/kernel/phasePortrait.ts), so none exercises the
 * suppressed/same-attractor case that `diagnose`'s `procrastinating` does.
 */
test("the templates cover their authored attractor pairs", () => {
  const observed = TEMPLATE_KEYS.map((key) => {
    const parsed = JSON.parse(runLambda("task", key, "--json").stdout);
    return `${parsed.initialAttractor}->${parsed.targetAttractor}`;
  });
  assert.deepEqual(observed, [
    "S*->J=0", // git-commit
    "∅->J=0", // documentation
    "∅->S*", // meta-prompting
    "J=0->S*", // mindset
    "S*->J=0", // code-review
  ]);
});

test("lambda task with an unknown key exits 1 and lists the available keys", () => {
  const result = runLambda("task", "not-a-template");
  assert.equal(result.status, 1);
  const out = `${result.stdout}${result.stderr}`;
  assert.match(out, /unknown task "not-a-template"/);
  for (const key of TEMPLATE_KEYS) {
    assert.match(out, new RegExp(key));
  }
});

const SUGGESTIONS: Readonly<Record<string, readonly string[]>> = {
  "git-commit": ["Kata", "Telo", "Seed", "Latch"],
  documentation: ["Telo", "Kata", "Axis", "Bind"],
  "meta-prompting": ["Pro", "Ortho", "Weave", "Seed"],
  mindset: ["Para", "Ana", "Crux", "Echo"],
  "code-review": ["Kata", "Telo", "Seed", "Latch"],
};

for (const [key, ops] of Object.entries(SUGGESTIONS)) {
  test(`lambda task ${key} prints the suggested-operators line`, () => {
    const result = runLambda("task", key);
    assert.equal(result.status, 0);
    assert.match(
      result.stdout,
      new RegExp(`^Suggested operators: ${ops.join(", ")}$`, "m"),
    );
  });

  test(`lambda task ${key} --json carries the suggested field`, () => {
    const parsed = JSON.parse(runLambda("task", key, "--json").stdout);
    assert.deepEqual(parsed.suggested, [...ops]);
  });
}

test("lambda task --json JSON shape matches diagnose's key set", () => {
  const parsed = JSON.parse(runLambda("task", "git-commit", "--json").stdout);
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
