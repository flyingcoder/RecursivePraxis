import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { describe, it } from "vitest";
import {
  CONFIG_FILE,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_URL,
  DEFAULT_SESSION_DIR,
  INIT_SETTING_KEYS,
  MODEL_HOST_IDS,
  SETTING_KEYS,
  Settings,
  SettingsError,
  modelKeyForHost,
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
  it("runs on a local Ollama server out of the box", () => {
    const settings = Settings.defaults("/tmp/project");
    assert.equal(settings.host(), "ollama");
    assert.equal(settings.require("ollamaBaseUrl"), DEFAULT_OLLAMA_URL);
    assert.equal(settings.require("ollamaModel"), DEFAULT_OLLAMA_MODEL);
    assert.equal(settings.sourceOf("defaultHost"), "default");
  });

  it("points the loopback address, not a remote endpoint", () => {
    assert.equal(new URL(DEFAULT_OLLAMA_URL).hostname, "127.0.0.1");
  });

  it("resolves the session dir under the given cwd", () => {
    assert.equal(
      Settings.defaults("/tmp/project").baseDir,
      path.resolve("/tmp/project", DEFAULT_SESSION_DIR),
    );
  });

  it("leaves credentials and remote model names unset", () => {
    const settings = Settings.defaults("/tmp/project");
    assert.equal(settings.get("anthropicApiKey"), undefined);
    assert.equal(settings.get("anthropicModel"), undefined);
  });
});

// --- scope: init-only vs environment ----------------------------------------------

describe("setting scopes", () => {
  it("ignores the environment for init-scoped settings", async () => {
    const settings = await Settings.load({
      cwd: tmpProject(),
      env: {
        RECURSIVE_PRAXIS_HOST: "anthropic",
        ANTHROPIC_MODEL: "from-env",
        OLLAMA_MODEL: "from-env",
      },
    });
    assert.equal(settings.host(), "ollama");
    assert.equal(settings.get("anthropicModel"), undefined);
  });

  it("reads secrets from the environment", async () => {
    const settings = await Settings.load({
      cwd: tmpProject(),
      env: { ANTHROPIC_API_KEY: "sk-test", CURSOR_API_KEY: "cur-test" },
    });
    assert.equal(settings.require("anthropicApiKey"), "sk-test");
    assert.equal(settings.require("cursorApiKey"), "cur-test");
    assert.equal(settings.sourceOf("anthropicApiKey"), "env");
  });

  it("ignores empty environment values instead of accepting them", async () => {
    const settings = await Settings.load({ cwd: tmpProject(), env: { ANTHROPIC_API_KEY: "  " } });
    assert.equal(settings.get("anthropicApiKey"), undefined);
  });

  it("classifies every key as exactly one of init-scoped or secret", () => {
    const secrets = SETTING_KEYS.filter((key) => !INIT_SETTING_KEYS.includes(key));
    assert.deepEqual([...secrets], ["anthropicApiKey", "cursorApiKey"]);
  });
});

// --- fail-closed reads ------------------------------------------------------------

describe("Settings.require", () => {
  it("points at lambda init for an unset init-scoped setting", () => {
    assert.throws(
      () => Settings.defaults("/tmp/project").require("anthropicModel"),
      (error: unknown) =>
        error instanceof SettingsError &&
        error.message === "anthropicModel is not configured — run: lambda init --host anthropic --model <name>",
    );
  });

  it("points at the environment variable for an unset secret", () => {
    assert.throws(
      () => Settings.defaults("/tmp/project").require("cursorApiKey"),
      (error: unknown) =>
        error instanceof SettingsError && error.message === "CURSOR_API_KEY is not configured",
    );
  });
});

// --- config file ------------------------------------------------------------------

describe("Settings.load", () => {
  it("applies init-scoped settings from the config file", async () => {
    const cwd = tmpProject();
    writeConfig(cwd, { defaultHost: "ollama", ollamaModel: "qwen2.5-coder" });
    const settings = await Settings.load({ cwd, env: {} });
    assert.equal(settings.require("ollamaModel"), "qwen2.5-coder");
    assert.equal(settings.sourceOf("ollamaModel"), "file");
  });

  it("lets an explicit override win over the config file", async () => {
    const cwd = tmpProject();
    writeConfig(cwd, { ollamaModel: "from-file" });
    const settings = await Settings.load({ cwd, env: {}, overrides: { ollamaModel: "from-flag" } });
    assert.equal(settings.require("ollamaModel"), "from-flag");
    assert.equal(settings.sourceOf("ollamaModel"), "override");
  });

  it("treats a missing config file as still-on-defaults", async () => {
    const settings = await Settings.load({ cwd: tmpProject(), env: {} });
    assert.equal(settings.host(), "ollama");
  });

  it("reads the config file from an explicit base dir", async () => {
    const cwd = tmpProject();
    const dir = path.join(cwd, "elsewhere");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, CONFIG_FILE), JSON.stringify({ defaultHost: "fake" }), "utf8");
    const settings = await Settings.load({ cwd, baseDir: dir, env: {} });
    assert.equal(settings.host(), "fake");
  });

  it("rejects a malformed config file", async () => {
    const cwd = tmpProject();
    mkdirSync(path.join(cwd, DEFAULT_SESSION_DIR), { recursive: true });
    writeFileSync(path.join(cwd, DEFAULT_SESSION_DIR, CONFIG_FILE), "{ not json", "utf8");
    await assert.rejects(Settings.load({ cwd, env: {} }), SettingsError);
  });

  it("rejects an unknown setting in the config file", async () => {
    const cwd = tmpProject();
    writeConfig(cwd, { nope: "value" });
    await assert.rejects(
      Settings.load({ cwd, env: {} }),
      (error: unknown) =>
        error instanceof SettingsError && error.message.includes('unknown setting "nope"'),
    );
  });

  it("rejects a secret stored in the config file", async () => {
    const cwd = tmpProject();
    writeConfig(cwd, { anthropicApiKey: "sk-leaked" });
    await assert.rejects(
      Settings.load({ cwd, env: {} }),
      (error: unknown) =>
        error instanceof SettingsError && error.message.includes("ANTHROPIC_API_KEY"),
    );
  });

  it("rejects an invalid host in the config file", async () => {
    const cwd = tmpProject();
    writeConfig(cwd, { defaultHost: "gpt" });
    await assert.rejects(Settings.load({ cwd, env: {} }), SettingsError);
  });

  it("rejects a non-string config value", async () => {
    const cwd = tmpProject();
    writeConfig(cwd, { ollamaModel: 42 });
    await assert.rejects(Settings.load({ cwd, env: {} }), SettingsError);
  });
});

// --- validation and immutability --------------------------------------------------

describe("Settings.with", () => {
  it("returns a new instance and leaves the original untouched", () => {
    const base = Settings.defaults("/tmp/project");
    const next = base.with({ ollamaModel: "qwen3" });
    assert.notEqual(base, next);
    assert.equal(base.require("ollamaModel"), DEFAULT_OLLAMA_MODEL);
    assert.equal(next.require("ollamaModel"), "qwen3");
  });

  it("rejects a host outside the supported set", () => {
    assert.throws(() => Settings.defaults("/tmp/project").with({ defaultHost: "gpt" }), SettingsError);
  });

  it("rejects a non-URL ollama endpoint and normalizes a trailing slash", () => {
    assert.throws(
      () => Settings.defaults("/tmp/project").with({ ollamaBaseUrl: "not-a-url" }),
      SettingsError,
    );
    assert.equal(
      Settings.defaults("/tmp/project")
        .with({ ollamaBaseUrl: "http://127.0.0.1:11434/" })
        .require("ollamaBaseUrl"),
      DEFAULT_OLLAMA_URL,
    );
  });
});

// --- serialization ----------------------------------------------------------------

describe("Settings serialization", () => {
  it("redacts secrets in toJSON but not in snapshot", async () => {
    const settings = await Settings.load({ cwd: tmpProject(), env: { ANTHROPIC_API_KEY: "sk-secret" } });
    assert.equal(settings.toJSON().anthropicApiKey, "[redacted]");
    assert.equal(settings.snapshot().anthropicApiKey, "sk-secret");
    assert.equal(JSON.stringify(settings).includes("sk-secret"), false);
  });
});

describe("Settings.save", () => {
  it("persists only non-default init-scoped settings, at mode 0600", async () => {
    const cwd = tmpProject();
    const settings = Settings.defaults(cwd).with({ defaultHost: "fake" });
    const target = await settings.save();
    assert.deepEqual(JSON.parse(readFileSync(target, "utf8")), { defaultHost: "fake" });
    assert.equal(statSync(target).mode & 0o777, 0o600);
  });

  it("never writes a secret, even when one is loaded", async () => {
    const cwd = tmpProject();
    const settings = await Settings.load({ cwd, env: { ANTHROPIC_API_KEY: "sk-secret" } });
    const written = readFileSync(await settings.with({ ollamaModel: "qwen3" }).save(), "utf8");
    assert.equal(written.includes("sk-secret"), false);
    assert.equal(written.includes("anthropicApiKey"), false);
  });

  it("round-trips through load", async () => {
    const cwd = tmpProject();
    await Settings.defaults(cwd).with({ defaultHost: "ollama", ollamaModel: "qwen3" }).save();
    const reloaded = await Settings.load({ cwd, env: {} });
    assert.equal(reloaded.require("ollamaModel"), "qwen3");
  });
});

// --- host / model mapping ---------------------------------------------------------

describe("modelKeyForHost", () => {
  it("maps every host except the deterministic fake to a model setting", () => {
    for (const host of MODEL_HOST_IDS) {
      const key = modelKeyForHost(host);
      if (host === "fake") assert.equal(key, undefined);
      else assert.equal(typeof key, "string");
    }
  });
});

// --- init flag parsing ------------------------------------------------------------

describe("parseConfigFlags", () => {
  it("returns an empty, unchanged patch when no config flags are passed", () => {
    const result = parseConfigFlags({}, Settings.defaults("/tmp/project"));
    assert.equal(result.ok && result.changed, false);
  });

  it("routes --model to the host named by --host", () => {
    const result = parseConfigFlags(
      { host: "anthropic", model: "claude-opus-5" },
      Settings.defaults("/tmp/project"),
    );
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.patch, {
      defaultHost: "anthropic",
      anthropicModel: "claude-opus-5",
    });
  });

  it("routes a lone --model to the already-configured host", () => {
    const result = parseConfigFlags({ model: "qwen3" }, Settings.defaults("/tmp/project"));
    assert.deepEqual(result.ok && result.patch, { ollamaModel: "qwen3" });
  });

  it("rejects --model for the fake host, which takes no model", () => {
    const result = parseConfigFlags(
      { host: "fake", model: "qwen3" },
      Settings.defaults("/tmp/project"),
    );
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.error.includes("takes no model name"), true);
  });

  it("rejects an unknown host", () => {
    const result = parseConfigFlags({ host: "gpt" }, Settings.defaults("/tmp/project"));
    assert.equal(!result.ok && result.error.includes("unknown host"), true);
  });

  it("rejects an invalid ollama url before anything is written", () => {
    const result = parseConfigFlags({ ollamaUrl: "nope" }, Settings.defaults("/tmp/project"));
    assert.equal(result.ok, false);
  });
});
