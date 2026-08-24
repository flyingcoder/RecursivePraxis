import { ClaudeCodeAdapter } from "./ClaudeCodeAdapter.js";
import { CursorAdapter } from "./CursorAdapter.js";
import { CodexAdapter } from "./CodexAdapter.js";
import { OpencodeAdapter } from "./OpencodeAdapter.js";
import type { HostAdapter, HostDetection } from "./HostAdapter.js";
import { HOST_IDS, type HostId } from "./types.js";
import type { HostContext } from "../detect/context.js";
import type { WorkflowDefinition } from "../init/workflows.js";

/**
 * The set of host agents this build knows about.
 *
 * Adding a fifth host is one new file plus one line here. Nothing else — not
 * `--tools` parsing, not the wizard, not `doctor`, `sync`, or `uninstall` —
 * enumerates hosts, because detection, layout, and rendering all live on the
 * host object rather than in the callers.
 */
export class HostRegistry {
  private readonly byId: ReadonlyMap<HostId, HostAdapter>;

  constructor(adapters: readonly HostAdapter[]) {
    this.byId = new Map(adapters.map((adapter) => [adapter.id, adapter]));
  }

  static default(): HostRegistry {
    return new HostRegistry([
      new ClaudeCodeAdapter(),
      new CursorAdapter(),
      new CodexAdapter(),
      new OpencodeAdapter(),
    ]);
  }

  /** Canonical order, so output and `--tools` parsing agree on ordering. */
  all(): readonly HostAdapter[] {
    return HOST_IDS.map((id) => this.byId.get(id)).filter(
      (adapter): adapter is HostAdapter => adapter !== undefined,
    );
  }

  get(id: HostId): HostAdapter | undefined {
    return this.byId.get(id);
  }

  /** `get`, but for an id already known to be registered. */
  require(id: HostId): HostAdapter {
    const adapter = this.byId.get(id);
    if (adapter === undefined) throw new Error(`no host adapter registered for "${id}"`);
    return adapter;
  }

  detectAll(ctx: HostContext, workflows: readonly WorkflowDefinition[]): readonly HostDetection[] {
    return this.all().map((adapter) => adapter.detect(ctx, workflows));
  }
}
