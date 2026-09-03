import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `runMetaPrompt` calls `process.exit` on a usage error, so it is driven
 * through the built CLI the way tests/cli-commands/diagnose.test.ts does rather
 * than imported.
 */
const cliPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../dist/cli.js");

function runLambda(...args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: "utf8" });
}

const INTENT = "Research about torsion field";

describe("lambda meta-prompt", () => {
  it("composes a brief from a comma-separated chain", () => {
    const result = runLambda("meta-prompt", INTENT, "Axis,Ana,Pro,Para,Kata,Latch");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(INTENT);
    expect(result.stdout).toContain("simultaneously");
  });

  it("accepts the formalism's own ∘ separator", () => {
    const comma = runLambda("meta-prompt", INTENT, "Axis,Ana,Pro,Para,Kata,Latch");
    const compose = runLambda("meta-prompt", INTENT, "Axis ∘ Ana ∘ Pro ∘ Para ∘ Kata ∘ Latch");
    expect(compose.status).toBe(0);
    expect(compose.stdout).toBe(comma.stdout);
  });

  it("emits no heading per operator", () => {
    // The step-list reading, re-entering through layout.
    const result = runLambda("meta-prompt", INTENT, "Axis,Ana,Pro,Para,Kata,Latch");
    expect(result.stdout).not.toMatch(/^#{2,}\s.*\b(Axis|Ana|Pro|Para|Kata|Latch)\b/mu);
  });

  it("reports the chain's own numbers under --json", () => {
    const result = runLambda("meta-prompt", INTENT, "Axis,Ana,Pro,Para,Kata,Latch", "--json");
    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.lambdaEffective).toBeCloseTo(0.658, 10);
    expect(payload.netContractive).toBe(true);
    expect(payload.properties).toHaveLength(6);
    expect(payload.verification.missingOperators).toEqual([]);
    expect(payload.verification.perOperatorHeadings).toEqual([]);
  });

  it("rejects a chain the grammar forbids rather than repairing it", () => {
    const result = runLambda("meta-prompt", INTENT, "Axis,Ana");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("end-on-ana");
  });

  it("rejects an operator outside the alphabet", () => {
    const result = runLambda("meta-prompt", INTENT, "Axis,Nope");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("not one of the 20 operators");
  });

  it("prints usage when the chain is missing", () => {
    const result = runLambda("meta-prompt", INTENT);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("usage: lambda meta-prompt");
  });
});
