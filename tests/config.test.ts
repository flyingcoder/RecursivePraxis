import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { describe, it } from "vitest";
import {
  CONFIG_FILE,
  CONTEXT_INJECTION_VALUES,
  DEFAULT_SESSION_DIR,
  SETTING_KEYS,
  Settings,
  SettingsError,
} from "../src/config/settings.js";
import { parseConfigFlags } from "../src/init/config-flags.js";

function tmpProject(): string {
  return mkdtempSync(path.join(os.tmpdir(), "praxis-config-"));
}

function writeConfig(cwd: string, payload: unknown): void {
  const dir = path.join(cwd, DEFAULT_SESSION_DIR);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, CONFIG_FILE), JSON.stringify(payload), "utf8");
}

// --- defaults ---------------------------------------------------------------------

describe("Settings.defaults", () => {
  it("enables context injection out of the box", () => {
    const settings = Settings.defaults("/tmp/project");
    assert.equal(settings.contextInjectionEnabled(), true);
    assert.equal(settings.require("contextInjection"), "on");
    assert.equal(settings.sourceOf("contextInjection"), "default");
  });

  it("resolves the session dir under the given cwd", () => {
    assert.equal(
      Settings.defaults("/tmp/project").baseDir,
      path.resolve("/tmp/project", DEFAULT_SESSION_DIR),
    );
  });

  it("has exactly one setting", () => {
    assert.deepEqual([...SETTING_KEYS], ["contextInjection"]);
  });
});

// --- fail-closed reads ------------------------------------------------------------

describe("Settings.require", () => {
  it("points at lambda init for an unset setting", () => {
    const settings = Settings.defaults("/tmp/project").with({ contextInjection: undefined });
    assert.throws(
      () => settings.require("contextInjection"),
      (error: unknown) =>
        error instanceof SettingsError &&
        error.message ===
          "contextInjection is not configured — run: lambda init --context-injection <on|off>",
    );
  });
});

// --- config file ------------------------------------------------------------------

describe("Settings.load", () => {
  it("applies settings from the config file", async () => {
    const cwd = tmpProject();
    writeConfig(cwd, { contextInjection: "off" });
    const settings = await Settings.load({ cwd });
    assert.equal(settings.contextInjectionEnabled(), false);
    assert.equal(settings.sourceOf("contextInjection"), "file");
  });

  it("lets an explicit override win over the config file", async () => {
    const cwd = tmpProject();
    writeConfig(cwd, { contextInjection: "off" });
    const settings = await Settings.load({ cwd, overrides: { contextInjection: "on" } });
    assert.equal(settings.contextInjectionEnabled(), true);
    assert.equal(settings.sourceOf("contextInjection"), "override");
  });

  it("treats a missing config file as still-on-defaults", async () => {
    const settings = await Settings.load({ cwd: tmpProject() });
    assert.equal(settings.contextInjectionEnabled(), true);
  });

  it("reads the config file from an explicit base dir", async () => {
    const cwd = tmpProject();
    const dir = path.join(cwd, "elsewhere");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, CONFIG_FILE), JSON.stringify({ contextInjection: "off" }), "utf8");
    const settings = await Settings.load({ cwd, baseDir: dir });
    assert.equal(settings.contextInjectionEnabled(), false);
  });

  it("rejects a malformed config file", async () => {
    const cwd = tmpProject();
    mkdirSync(path.join(cwd, DEFAULT_SESSION_DIR), { recursive: true });
    writeFileSync(path.join(cwd, DEFAULT_SESSION_DIR, CONFIG_FILE), "{ not json", "utf8");
    await assert.rejects(Settings.load({ cwd }), SettingsError);
  });

  it("rejects an unknown setting in the config file", async () => {
    const cwd = tmpProject();
    writeConfig(cwd, { nope: "value" });
    await assert.rejects(
      Settings.load({ cwd }),
      (error: unknown) =>
        error instanceof SettingsError && error.message.includes('unknown setting "nope"'),
    );
  });

  it("rejects an invalid context-injection value in the config file", async () => {
    const cwd = tmpProject();
    writeConfig(cwd, { contextInjection: "sometimes" });
    await assert.rejects(Settings.load({ cwd }), SettingsError);
  });

  it("rejects a non-string config value", async () => {
    const cwd = tmpProject();
    writeConfig(cwd, { contextInjection: 42 });
    await assert.rejects(Settings.load({ cwd }), SettingsError);
  });
});

// --- validation and immutability --------------------------------------------------

describe("Settings.with", () => {
  it("returns a new instance and leaves the original untouched", () => {
    const base = Settings.defaults("/tmp/project");
    const next = base.with({ contextInjection: "off" });
    assert.notEqual(base, next);
    assert.equal(base.contextInjectionEnabled(), true);
    assert.equal(next.contextInjectionEnabled(), false);
  });

  it("rejects a value outside the supported set", () => {
    assert.throws(
      () => Settings.defaults("/tmp/project").with({ contextInjection: "sometimes" }),
      SettingsError,
    );
  });

  it("supports both context-injection values", () => {
    for (const value of CONTEXT_INJECTION_VALUES) {
      const settings = Settings.defaults("/tmp/project").with({ contextInjection: value });
      assert.equal(settings.require("contextInjection"), value);
    }
  });
});

// --- serialization ----------------------------------------------------------------

describe("Settings serialization", () => {
  it("snapshot and toJSON agree — there is nothing left to redact", async () => {
    const settings = await Settings.load({ cwd: tmpProject() });
    assert.deepEqual(settings.toJSON(), settings.snapshot());
  });
});

describe("Settings.save", () => {
  it("persists only non-default settings, at mode 0600", async () => {
    const cwd = tmpProject();
    const settings = Settings.defaults(cwd).with({ contextInjection: "off" });
    const target = await settings.save();
    assert.deepEqual(JSON.parse(readFileSync(target, "utf8")), { contextInjection: "off" });
    assert.equal(statSync(target).mode & 0o777, 0o600);
  });

  it("writes nothing for an unchanged default", async () => {
    const cwd = tmpProject();
    const target = await Settings.defaults(cwd).save();
    assert.deepEqual(JSON.parse(readFileSync(target, "utf8")), {});
  });

  it("round-trips through load", async () => {
    const cwd = tmpProject();
    await Settings.defaults(cwd).with({ contextInjection: "off" }).save();
    const reloaded = await Settings.load({ cwd });
    assert.equal(reloaded.contextInjectionEnabled(), false);
  });
});

// --- init flag parsing ------------------------------------------------------------

describe("parseConfigFlags", () => {
  it("returns an empty, unchanged patch when no config flags are passed", () => {
    const result = parseConfigFlags({}, Settings.defaults("/tmp/project"));
    assert.equal(result.ok && result.changed, false);
  });

  it("applies --context-injection", () => {
    const result = parseConfigFlags(
      { contextInjection: "off" },
      Settings.defaults("/tmp/project"),
    );
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.patch, { contextInjection: "off" });
  });

  it("rejects an unsupported value before anything is written", () => {
    const result = parseConfigFlags(
      { contextInjection: "sometimes" },
      Settings.defaults("/tmp/project"),
    );
    assert.equal(result.ok, false);
  });
});
