import { existsSync, readdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Everything detection and layout resolution need from the outside world.
 *
 * It is an injected record rather than direct `node:fs`/`process` access so
 * the host adapters can be exercised against a synthetic machine — a fake
 * home directory, a fake PATH, a fake platform — with no filesystem at all.
 * Every probe in `src/detect/signals.ts` reads the world only through here.
 */
export interface HostContext {
  readonly env: NodeJS.ProcessEnv;
  readonly home: string;
  readonly projectRoot: string;
  readonly platform: NodeJS.Platform;
  /** True when `absPath` exists, of any kind. */
  readonly exists: (absPath: string) => boolean;
  /** Entry names in `absPath`, or an empty list when it is missing or not a directory. */
  readonly readDir: (absPath: string) => readonly string[];
  /** Absolute path of `binary` if resolvable on PATH, honouring PATHEXT on Windows. */
  readonly onPath: (binary: string) => string | undefined;
}

function realExists(absPath: string): boolean {
  return existsSync(absPath);
}

function realReadDir(absPath: string): readonly string[] {
  try {
    return readdirSync(absPath);
  } catch {
    return [];
  }
}

/**
 * PATH resolution without shelling out. On Windows a bare name is not
 * executable on its own, so each PATHEXT suffix is tried in turn; elsewhere
 * the name is used verbatim. Returns the first hit, never a guess.
 */
function makeOnPath(env: NodeJS.ProcessEnv, platform: NodeJS.Platform) {
  const isWindows = platform === "win32";
  const rawPath = env.PATH ?? env.Path ?? "";
  const entries = rawPath.split(path.delimiter).filter((entry) => entry.length > 0);
  const extensions = isWindows
    ? (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter((ext) => ext.length > 0)
    : [""];

  return (binary: string): string | undefined => {
    for (const dir of entries) {
      for (const ext of extensions) {
        const candidate = path.join(dir, `${binary}${ext}`);
        try {
          if (statSync(candidate).isFile()) return candidate;
        } catch {
          // Unreadable or missing candidate: keep looking rather than fail.
        }
      }
    }
    return undefined;
  };
}

export interface HostContextOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly home?: string;
  readonly projectRoot?: string;
  readonly platform?: NodeJS.Platform;
  readonly exists?: (absPath: string) => boolean;
  readonly readDir?: (absPath: string) => readonly string[];
  readonly onPath?: (binary: string) => string | undefined;
}

/** The real machine, with any field overridable for tests. */
export function createHostContext(options: HostContextOptions = {}): HostContext {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  return {
    env,
    home: options.home ?? os.homedir(),
    projectRoot: options.projectRoot ?? process.cwd(),
    platform,
    exists: options.exists ?? realExists,
    readDir: options.readDir ?? realReadDir,
    onPath: options.onPath ?? makeOnPath(env, platform),
  };
}
