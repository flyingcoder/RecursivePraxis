# Authoring what `lambda init` installs

Everything a host agent receives is an **asset**. One file per asset, one
directory per kind:

```
src/init/
  skills/<slug>.ts      model-invoked prose        → SKILL.md
  commands/<slug>.ts    human-invoked prose        → /praxis-<slug>
  agents/<slug>.ts      delegated sub-agents       → agents/<slug>.md
  rules/<slug>.ts       always-on context          → rules/<slug>.md
  hooks/<slug>.ts       shell command on an event  → hooks.json
  mcp/<slug>.ts         an MCP server              → .mcp.json
```

Each directory has an `index.ts` listing its assets. `registry.ts` combines the
six lists into `ASSETS`. **Those seven files are the only places content is
enumerated** — no host adapter, no wizard step, and none of `doctor`, `sync`, or
`uninstall` knows what assets exist.

## Adding one

Two steps, always:

1. Create `src/init/<kind>s/<slug>.ts` with a default export.
2. Add it to that directory's `index.ts`.

```ts
// src/init/skills/inject.ts
import { Skill } from "../assets/ProseAsset.js";
import { EPISTEMIC_FOOTER } from "../shared/epistemic-footer.js";

export default new Skill({
  slug: "inject",
  title: "RecursivePraxis: inject",
  description: "Read the session briefing `lambda inject` prepends to each turn.",
  footers: [EPISTEMIC_FOOTER],
  body: `
# RecursivePraxis: inject

…markdown…
`,
});
```

Each kind's `index.ts` carries a worked example for that kind in its header
comment.

## The rules bodies must follow

**Bodies are host-neutral.** The same string is written to every host that takes
the kind. Anything that differs per host belongs in `src/hosts/` or in a render
plugin — never in a second copy of a body.

**Cross-reference with `{{invoke:<slug>}}`.** It is rewritten into whichever
syntax the target host and scope use: `/praxis:status`, `/praxis-status`,
`$recursive-praxis-status`, `/recursive-praxis:status`. A slug that names no
invocable asset throws at render time rather than shipping as literal text.
Skills and commands are invocable; agents and rules are not.

**`description` is load-bearing**, not decoration — it is the frontmatter field
hosts use to decide when to load an asset.

## Sharing prose between a skill and a command

The seven kernel commands are word-for-word their matching skills. That is
stated once rather than duplicated:

```ts
// src/init/commands/status.ts
import { Command } from "../assets/ProseAsset.js";
import statusSkill from "../skills/status.js";

export default Command.mirroring(statusSkill);
```

To let a command diverge, replace that call with
`new Command({ slug, title, description, body })` and give it its own body.
Nothing outside the file changes.

## Which hosts receive which kinds

An adapter's `layout()` returns a **placement table** naming the kinds that host
takes and the path each lands at (`src/hosts/layouts.ts`). A kind absent from
the table is a kind that host does not receive — which is how a kind can exist
before every host supports it.

| Host | Currently placed |
| --- | --- |
| Claude Code (project) | skill, command |
| Claude Code (global, plugin) | skill |
| Cursor | skill, command |
| Codex CLI | skill |
| opencode | command |

Adding `agent`, `rule`, `hooks`, or `mcp` to a host is one line in its
placement table — but the paths drift between vendor releases, so check the
vendor's documentation first and update that adapter's `verifiedAgainst`
string when you do.

## What the two families cost

`Skill`, `Command`, `Agent`, and `Rule` are Markdown. They are wrapped in the
RecursivePraxis managed markers, so anything a user appends after `MARKER_END`
survives a re-run and a file without markers is never touched.

`Hook` and `McpServer` are JSON, and JSON has nowhere to put a marker. Those
files are whole-file generated and compared by content: a hand-edit is reported
as drift by `lambda doctor` and overwritten by `lambda sync`, not preserved.
They also aggregate — every hook becomes one `hooks.json`, every server one
`.mcp.json` — which is why a layout is handed the whole registry rather than
one asset at a time.
