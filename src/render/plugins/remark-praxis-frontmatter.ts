import type { Root, Yaml } from "mdast";
import { stringify as stringifyYaml } from "yaml";
import { readPraxisData } from "./praxis-data.js";
import type { VFile } from "vfile";

/**
 * Prepends the host's YAML frontmatter block.
 *
 * Which fields a host wants is fixed per host (`fields`); their values come
 * from the file being rendered. Serialization is delegated to `yaml` rather
 * than to `JSON.stringify` per line, so a description containing a colon,
 * a quote, or a newline is quoted correctly instead of by luck.
 */

export type FrontmatterField = "name" | "description";

export interface FrontmatterOptions {
  readonly fields: readonly FrontmatterField[];
}

export function remarkPraxisFrontmatter(options: FrontmatterOptions) {
  return (tree: Root, file: VFile): void => {
    const { workflow, target } = readPraxisData(file.data as Record<string, unknown>);

    const values: Record<string, string> = {};
    for (const field of options.fields) {
      if (field === "description") {
        values.description = workflow.summary;
        continue;
      }
      // A skill's `name` must match the directory the host loads it from, so
      // the layout supplies it; a command file has no name field at all.
      if (target.name !== undefined) values.name = target.name;
    }

    if (Object.keys(values).length === 0) return;

    // lineWidth: 0 disables folding. A wrapped `description:` is still legal
    // YAML, but host agents vary in how tolerantly they parse frontmatter, and
    // a value that survives one host's reader and not another's is exactly the
    // kind of per-host difference this pipeline exists to remove.
    const node: Yaml = { type: "yaml", value: stringifyYaml(values, { lineWidth: 0 }).trimEnd() };
    tree.children.unshift(node);
  };
}
