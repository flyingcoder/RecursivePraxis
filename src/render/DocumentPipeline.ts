import { unified, type Processor } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { VFile } from "vfile";
import type { Root } from "mdast";
import type { InvocationResolver, RenderTarget, Scope } from "../hosts/types.js";
import type { WorkflowDefinition } from "../init/workflows.js";
import { WORKFLOW_IDS } from "../init/workflows.js";
import { remarkPraxisInvocation } from "./plugins/remark-praxis-invocation.js";
import { remarkPraxisFrontmatter, type FrontmatterField } from "./plugins/remark-praxis-frontmatter.js";
import { remarkPraxisManagedBlock } from "./plugins/remark-praxis-managed-block.js";
import { PRAXIS_DATA_KEY, type PraxisFileData } from "./plugins/praxis-data.js";

/**
 * Turns a host-neutral workflow into one host's file.
 *
 * Generation used to be string concatenation, which forced a specific
 * limitation: because bodies were copied verbatim to every host, a body could
 * not name its own invocation syntax — the single thing that differs per host.
 * Here that difference is a transform over the parsed document rather than a
 * subject the prose has to avoid.
 *
 * Stringify options are pinned so output is a function of the tree alone. Two
 * runs of `lambda init` must produce identical bytes, or the "preserved (already
 * up to date)" result becomes a lie and every re-run churns every file.
 */

export interface HostRenderOptions {
  readonly frontmatter: readonly FrontmatterField[];
}

const STRINGIFY_OPTIONS = {
  bullet: "-",
  fence: "`",
  fences: true,
  rule: "-",
  emphasis: "_",
  incrementListMarker: false,
} as const;

/**
 * The slice of `unified`'s processor this class uses, named structurally.
 * unified's generics thread the tree type through every `.use`, and the two
 * chains below differ in plugin count, so naming the capability rather than
 * the exact instantiation keeps both assignable without a cast per field.
 */
interface MarkdownProcessor {
  processSync(value: Parameters<Processor["processSync"]>[0]): { toString(): string };
  parse(value: string): Root;
}

/** Parse/serialize only: no praxis transforms, so it is safe to run on already-rendered output. */
function baseProcessor(): MarkdownProcessor {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkStringify, STRINGIFY_OPTIONS)
    .freeze() as unknown as MarkdownProcessor;
}

export class DocumentPipeline {
  private constructor(
    private readonly processor: MarkdownProcessor,
    private readonly normalizer: MarkdownProcessor,
  ) {}

  static for(host: InvocationResolver, scope: Scope, options: HostRenderOptions): DocumentPipeline {
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkFrontmatter, ["yaml"])
      .use(remarkPraxisInvocation, { host, scope, knownIds: WORKFLOW_IDS })
      .use(remarkPraxisFrontmatter, { fields: options.frontmatter })
      .use(remarkPraxisManagedBlock)
      .use(remarkStringify, STRINGIFY_OPTIONS)
      .freeze() as unknown as MarkdownProcessor;

    return new DocumentPipeline(processor, baseProcessor());
  }

  /** The complete on-disk content for one workflow on one host, frontmatter and markers included. */
  render(workflow: WorkflowDefinition, target: RenderTarget): string {
    const file = new VFile({ value: workflow.body });
    const data: PraxisFileData = { workflow, target };
    (file.data as Record<string, unknown>)[PRAXIS_DATA_KEY] = data;
    return String(this.processor.processSync(file));
  }

  /**
   * Re-serializes already-rendered content without re-applying any transform.
   *
   * `render(w) === restringify(render(w))` is the fixed-point property that
   * keeps `init` idempotent: if remark's own normalization were not already a
   * fixed point of our output, every re-run would rewrite every file and the
   * managed-marker merge would report a permanent, meaningless drift.
   */
  restringify(content: string): string {
    return String(this.normalizer.processSync(content));
  }

  /** The parsed managed region of an on-disk file, for structural drift reporting. */
  parseManaged(existing: string): Root | undefined {
    const tree = this.normalizer.parse(existing);
    const start = tree.children.findIndex(
      (node) => node.type === "html" && node.value.includes("RECURSIVEPRAXIS:MANAGED:START"),
    );
    const end = tree.children.findIndex(
      (node) => node.type === "html" && node.value.includes("RECURSIVEPRAXIS:MANAGED:END"),
    );
    if (start === -1 || end === -1 || end < start) return undefined;
    return { type: "root", children: tree.children.slice(start + 1, end) };
  }
}
