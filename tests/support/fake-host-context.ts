import { createHostContext, type HostContext } from "../../src/detect/context.js";

/**
 * A synthetic machine: a made-up home, a made-up project, a made-up PATH.
 *
 * Detection is entirely a function of `HostContext`, so every adapter can be
 * exercised against an exact world without touching the real filesystem — and
 * without the test's result depending on which agents happen to be installed
 * on the machine running it.
 */
export interface FakeWorld {
  readonly home?: string;
  readonly projectRoot?: string;
  readonly platform?: NodeJS.Platform;
  readonly env?: NodeJS.ProcessEnv;
  /** Absolute paths that exist. */
  readonly paths?: readonly string[];
  /** Binary name → resolved absolute path. */
  readonly binaries?: Readonly<Record<string, string>>;
  /** Absolute directory → entry names. */
  readonly dirs?: Readonly<Record<string, readonly string[]>>;
}

export const FAKE_HOME = "/fake/home";
export const FAKE_PROJECT = "/fake/project";

export function fakeContext(world: FakeWorld = {}): HostContext {
  const paths = new Set(world.paths ?? []);
  const dirs = world.dirs ?? {};
  const binaries = world.binaries ?? {};
  return createHostContext({
    env: world.env ?? {},
    home: world.home ?? FAKE_HOME,
    projectRoot: world.projectRoot ?? FAKE_PROJECT,
    platform: world.platform ?? "linux",
    exists: (absPath) => paths.has(absPath) || Object.hasOwn(dirs, absPath),
    readDir: (absPath) => dirs[absPath] ?? [],
    onPath: (binary) => binaries[binary],
  });
}
