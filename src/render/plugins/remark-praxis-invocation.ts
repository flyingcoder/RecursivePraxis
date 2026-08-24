import type { Root, Text, PhrasingContent } from "mdast";
import { visit } from "unist-util-visit";
import type { InvocationResolver, Scope } from "../../hosts/types.js";

/**
 * Rewrites `{{invoke:<workflow-id>}}` into this host's actual invocation
 * syntax.
 *
 * This transform is the reason the pipeline exists. Invocation is the one
 * thing that genuinely differs per host — `/praxis:status`, `/praxis-status`,
 * `$recursive-praxis-status`, `/recursive-praxis:status` — so before this,
 * a workflow body could not mention how to call anything, and every body
 * worked around it by staying silent. One source, four correct outputs.
 *
 * The replacement is an `inlineCode` node, never text: `remark-stringify`
 * escapes punctuation in text nodes, and Codex's `$` prefix and Claude's
 * `[`-adjacent forms would come out backslashed in a user's terminal.
 */

const PATTERN = /\{\{invoke:([a-z0-9-]+)\}\}/g;

export interface InvocationOptions {
  readonly host: InvocationResolver;
  readonly scope: Scope;
  /** Every workflow id that exists. An unknown id is a bug, not a literal. */
  readonly knownIds: readonly string[];
}

export function remarkPraxisInvocation(options: InvocationOptions) {
  const known = new Set(options.knownIds);

  return (tree: Root): void => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (parent === undefined || index === undefined) return;
      if (!node.value.includes("{{invoke:")) return;

      const replacement: PhrasingContent[] = [];
      let cursor = 0;
      PATTERN.lastIndex = 0;
      for (let match = PATTERN.exec(node.value); match !== null; match = PATTERN.exec(node.value)) {
        const workflowId = match[1]!;
        if (!known.has(workflowId)) {
          throw new Error(
            `{{invoke:${workflowId}}} names no workflow (known: ${options.knownIds.join(", ")})`,
          );
        }
        if (match.index > cursor) {
          replacement.push({ type: "text", value: node.value.slice(cursor, match.index) });
        }
        replacement.push({ type: "inlineCode", value: options.host.invocation(workflowId, options.scope) });
        cursor = match.index + match[0].length;
      }
      if (cursor < node.value.length) {
        replacement.push({ type: "text", value: node.value.slice(cursor) });
      }

      (parent.children as PhrasingContent[]).splice(index, 1, ...replacement);
      // Resume after the nodes just inserted; none of them can match again.
      return index + replacement.length;
    });
  };
}
