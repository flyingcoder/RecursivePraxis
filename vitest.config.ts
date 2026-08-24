import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    /**
     * Several suites (cli, fail-closed, init, vocab, cli-commands/diagnose)
     * exercise the CLI by spawning `dist/cli.js`, and some spawn four or five
     * processes within a single test. At roughly 600ms per spawn that approaches
     * vitest's 5s default unassisted, and crosses it once the suites run in
     * parallel — producing failures that are load artifacts rather than real
     * regressions. The budget is raised centrally so no individual suite has to
     * trade coverage for headroom.
     */
    testTimeout: 30_000,
  },
});
