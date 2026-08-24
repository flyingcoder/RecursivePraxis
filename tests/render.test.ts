import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { HostRegistry } from "../src/hosts/HostRegistry.js";
import { SCOPES, type Scope } from "../src/hosts/types.js";
import { WORKFLOWS } from "../src/init/workflows.js";
import { DocumentPipeline } from "../src/render/DocumentPipeline.js";
import {
  MARKER_END,
  MARKER_START,
  hasManagedMarkers,
  managedRegion,
  mergeManaged,
  renderManagedHead,
} from "../src/render/managed-block.js";
import { fakeContext } from "./support/fake-host-context.js";

const registry = HostRegistry.default();
const ctx = fakeContext();

function everyRenderedFile(): { label: string; content: string }[] {
  const out: { label: string; content: string }[] = [];
  for (const scope of SCOPES) {
    for (const host of registry.all()) {
      for (const file of host.plan(WORKFLOWS, ctx, scope, { version: "9.9.9" })) {
        if (file.kind === "manifest") continue;
        out.push({ label: `${host.id}/${scope}/${file.relPath}`, content: file.content });
      }
    }
  }
  return out;
}

// --- the property that keeps `init` idempotent -----------------------------------

describe("render fixed point", () => {
  it("render(w) === restringify(render(w)) for every workflow x host x scope", () => {
    for (const scope of SCOPES) {
      for (const host of registry.all()) {
        const pipeline = host.pipeline(scope);
        for (const workflow of WORKFLOWS) {
          const rendered = pipeline.render(workflow, {
            kind: "skill",
            name: `recursive-praxis-${workflow.id}`,
          });
          assert.equal(
            pipeline.restringify(rendered),
            rendered,
            `not a fixed point: ${host.id}/${scope}/${workflow.id}`,
          );
        }
      }
    }
  });

  it("renders byte-identically when called twice", () => {
    const host = registry.require("claude");
    const target = { kind: "skill" as const, name: "recursive-praxis-status" };
    const first = host.pipeline("project").render(WORKFLOWS[0]!, target);
    const second = host.pipeline("project").render(WORKFLOWS[0]!, target);
    assert.equal(second, first);
  });
});

// --- the two escaping traps the design calls out ---------------------------------

describe("escaping", () => {
  it("emits Codex's $-prefixed invocation intact, not backslash-escaped", () => {
    const rendered = registry
      .require("codex")
      .pipeline("project")
      .render(WORKFLOWS.find((w) => w.id === "status")!, { kind: "skill", name: "x" });
    assert.match(rendered, /`\$recursive-praxis-session`/);
    assert.doesNotMatch(rendered, /\\\$/);
  });

  it("emits each host's own invocation form for the same source text", () => {
    const status = WORKFLOWS.find((w) => w.id === "status")!;
    const expected: Record<string, RegExp> = {
      "claude/project": /`\/praxis:session`/,
      "claude/global": /`\/recursive-praxis:session`/,
      "cursor/project": /`\/praxis-session`/,
      "codex/project": /`\$recursive-praxis-session`/,
      "opencode/project": /`\/praxis-session`/,
    };
    for (const [key, pattern] of Object.entries(expected)) {
      const [hostId, scope] = key.split("/") as [string, Scope];
      const host = registry.all().find((h) => h.id === hostId)!;
      const rendered = host.pipeline(scope).render(status, { kind: "skill", name: "x" });
      assert.match(rendered, pattern, `wrong invocation for ${key}`);
    }
  });

  it("introduces no backslash escapes anywhere in any generated file", () => {
    for (const file of everyRenderedFile()) {
      assert.doesNotMatch(file.content, /\\[_*$[\]]/, `escaped punctuation in ${file.label}`);
    }
  });

  it("leaves no unresolved {{invoke:…}} placeholder in any generated file", () => {
    for (const file of everyRenderedFile()) {
      assert.doesNotMatch(file.content, /\{\{invoke:/, `unresolved placeholder in ${file.label}`);
    }
  });

  it("rejects an invoke placeholder naming no workflow, rather than emitting it", () => {
    const pipeline = DocumentPipeline.for(registry.require("claude"), "project", {
      frontmatter: ["description"],
    });
    assert.throws(
      () =>
        pipeline.render(
          { id: "x", title: "x", summary: "x", body: "See {{invoke:nonexistent}}." },
          { kind: "skill", name: "x" },
        ),
      /names no workflow/,
    );
  });
});

// --- frontmatter -----------------------------------------------------------------

describe("frontmatter", () => {
  it("never folds a long description across lines", () => {
    for (const file of everyRenderedFile()) {
      const frontmatter = file.content.slice(0, file.content.indexOf("\n---", 4));
      assert.doesNotMatch(frontmatter, /\n\s+\S/, `folded frontmatter in ${file.label}`);
    }
  });

  it("gives opencode commands a description and no name", () => {
    const file = registry.require("opencode").plan(WORKFLOWS, ctx, "project", { version: "1" })[0]!;
    assert.match(file.content, /^---\ndescription: /);
    assert.doesNotMatch(file.content.slice(0, 200), /\nname:/);
  });

  it("keeps frontmatter outside the managed region on every generated file", () => {
    for (const file of everyRenderedFile()) {
      assert.ok(file.content.startsWith("---\n"), `no frontmatter in ${file.label}`);
      assert.ok(
        file.content.indexOf("\n---\n") < file.content.indexOf(MARKER_START),
        `frontmatter inside the managed region in ${file.label}`,
      );
    }
  });
});

// --- managed markers -------------------------------------------------------------

describe("managed markers", () => {
  it("wraps every generated file in both markers", () => {
    for (const file of everyRenderedFile()) {
      assert.ok(hasManagedMarkers(file.content), `missing markers in ${file.label}`);
    }
  });

  it("detects both markers present", () => {
    const head = renderManagedHead("---\nname: x\n---", "body text");
    assert.ok(hasManagedMarkers(head));
    assert.ok(head.includes(MARKER_START));
    assert.ok(head.includes(MARKER_END));
  });

  it("does not treat an arbitrary file as managed", () => {
    assert.equal(hasManagedMarkers("# just a regular file\n"), false);
  });

  it("merging an unchanged file reports changed=false and round-trips byte-for-byte", () => {
    const head = renderManagedHead("---\nname: x\n---", "body text");
    const merged = mergeManaged(head, head);
    assert.equal(merged.changed, false);
    assert.equal(merged.content, head);
  });

  it("merging with a new head preserves trailing user content", () => {
    const oldHead = renderManagedHead("---\nname: x\n---", "old body");
    const existing = `${oldHead}\n## user notes\nkeep me\n`;
    const merged = mergeManaged(existing, renderManagedHead("---\nname: x\n---", "new body"));
    assert.equal(merged.changed, true);
    assert.match(merged.content, /new body/);
    assert.doesNotMatch(merged.content, /old body/);
    assert.match(merged.content, /## user notes\nkeep me/);
  });

  it("re-merging a merged result is stable (no blank-line growth)", () => {
    const head = renderManagedHead("---\nname: x\n---", "body text");
    const first = mergeManaged(`${head}\n\nappendix\n`, head);
    const second = mergeManaged(first.content, head);
    assert.equal(second.content, first.content);
    assert.equal(second.changed, false);
  });

  it("extracts the managed region alone, excluding appended user content", () => {
    const head = renderManagedHead("---\nname: x\n---", "body text");
    const region = managedRegion(`${head}\n## mine\nkeep me\n`);
    assert.ok(region!.startsWith(MARKER_START));
    assert.ok(region!.endsWith(MARKER_END));
    assert.doesNotMatch(region!, /keep me/);
  });

  it("returns no region for a file that is not ours", () => {
    assert.equal(managedRegion("# hand written\n"), undefined);
  });

  it("parses the managed region into a tree for structural drift reporting", () => {
    const host = registry.require("claude");
    const content = host.plan(WORKFLOWS, ctx, "project", { version: "1" })[0]!.content;
    const tree = host.pipeline("project").parseManaged(content);
    assert.ok(tree);
    assert.ok(tree!.children.some((node) => node.type === "heading"));
    assert.ok(tree!.children.every((node) => node.type !== "yaml"));
  });
});
