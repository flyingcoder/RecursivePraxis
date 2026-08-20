import path from "node:path";
import type { WorkflowDefinition } from "./workflows.js";

export const TOOL_IDS = ["claude", "cursor", "codex"] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export function isToolId(value: string): value is ToolId {
  return (TOOL_IDS as readonly string[]).includes(value);
}

function skillDirName(workflowId: string): string {
  return `recursive-praxis-${workflowId}`;
}

function yamlFrontmatter(fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  return ["---", ...lines, "---"].join("\n");
}

export interface TargetDefinition {
  readonly id: ToolId;
  readonly label: string;
  /** Relative path (from project root) to this workflow's SKILL.md. */
  skillFile(workflowId: string): string;
  /** Relative path to this workflow's command file, or undefined if the host has no project-local command surface. */
  commandFile(workflowId: string): string | undefined;
  /** How a user/agent invokes this workflow on this host. */
  invocation(workflowId: string): string;
  renderSkillFrontmatter(workflow: WorkflowDefinition): string;
  renderCommandFrontmatter(workflow: WorkflowDefinition): string;
}

const claude: TargetDefinition = {
  id: "claude",
  label: "Claude Code",
  skillFile: (workflowId) => path.posix.join(".claude", "skills", skillDirName(workflowId), "SKILL.md"),
  commandFile: (workflowId) => path.posix.join(".claude", "commands", "praxis", `${workflowId}.md`),
  invocation: (workflowId) => `/praxis:${workflowId}`,
  renderSkillFrontmatter: (workflow) =>
    yamlFrontmatter({ name: skillDirName(workflow.id), description: workflow.summary }),
  renderCommandFrontmatter: (workflow) => yamlFrontmatter({ description: workflow.summary }),
};

const cursor: TargetDefinition = {
  id: "cursor",
  label: "Cursor",
  skillFile: (workflowId) => path.posix.join(".cursor", "skills", skillDirName(workflowId), "SKILL.md"),
  commandFile: (workflowId) => path.posix.join(".cursor", "commands", `praxis-${workflowId}.md`),
  invocation: (workflowId) => `/praxis-${workflowId}`,
  renderSkillFrontmatter: (workflow) =>
    yamlFrontmatter({ name: skillDirName(workflow.id), description: workflow.summary }),
  renderCommandFrontmatter: (workflow) => yamlFrontmatter({ description: workflow.summary }),
};

const codex: TargetDefinition = {
  id: "codex",
  label: "Codex",
  skillFile: (workflowId) => path.posix.join(".agents", "skills", skillDirName(workflowId), "SKILL.md"),
  commandFile: () => undefined,
  invocation: (workflowId) => `$recursive-praxis-${workflowId}`,
  renderSkillFrontmatter: (workflow) =>
    yamlFrontmatter({ name: skillDirName(workflow.id), description: workflow.summary }),
  renderCommandFrontmatter: (workflow) => yamlFrontmatter({ description: workflow.summary }),
};

export const TARGETS: Record<ToolId, TargetDefinition> = { claude, cursor, codex };
