import type { PhrasingContent, Root, RootContent } from "mdast";
import { MANAGED_NOTICE_SEGMENTS, MARKER_END, MARKER_START } from "../managed-block.js";

/**
 * Wraps the document body in the RecursivePraxis managed markers.
 *
 * The markers are `html` nodes rather than raw string concatenation, which is
 * what lets `lambda doctor` describe drift by section — the managed region is
 * a node range in a parsed tree, not a byte offset — while keeping exactly
 * the guarantees `mergeManaged` already made: content after MARKER_END is
 * never touched, and a file without markers is never ours.
 *
 * Runs last, after frontmatter has been prepended, so the frontmatter block
 * stays outside the managed region where every host expects to find it.
 */

const NOTICE: PhrasingContent[] = MANAGED_NOTICE_SEGMENTS.map((segment) =>
  segment.code
    ? ({ type: "inlineCode", value: segment.value } as const)
    : ({ type: "text", value: segment.value } as const),
);

export function remarkPraxisManagedBlock() {
  return (tree: Root): void => {
    const hasFrontmatter = tree.children[0]?.type === "yaml";
    const frontmatter = hasFrontmatter ? tree.children.slice(0, 1) : [];
    const body = tree.children.slice(frontmatter.length);

    const wrapped: RootContent[] = [
      ...frontmatter,
      { type: "html", value: MARKER_START },
      { type: "blockquote", children: [{ type: "paragraph", children: [...NOTICE] }] },
      ...body,
      { type: "html", value: MARKER_END },
    ];

    tree.children = wrapped;
  };
}
