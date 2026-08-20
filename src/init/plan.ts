import { TARGETS, type ToolId } from "./targets.js";
import { WORKFLOWS } from "./workflows.js";
import { renderManagedHead } from "./managed-block.js";

export interface PlannedFile {
  readonly toolId: ToolId;
  readonly toolLabel: string;
  readonly workflowId: string;
  readonly kind: "skill" | "command";
  /** Relative to the project root. */
  readonly relPath: string;
  readonly freshHead: string;
}

export interface HostSummary {
  readonly toolId: ToolId;
  readonly toolLabel: string;
  readonly invocations: readonly { workflowId: string; invocation: string }[];
}

export interface InitPlan {
  readonly files: readonly PlannedFile[];
  readonly hosts: readonly HostSummary[];
}

export function buildPlan(toolIds: readonly ToolId[]): InitPlan {
  const files: PlannedFile[] = [];
  const hosts: HostSummary[] = [];

  for (const toolId of toolIds) {
    const target = TARGETS[toolId];
    const invocations: { workflowId: string; invocation: string }[] = [];

    for (const workflow of WORKFLOWS) {
      const skillFrontmatter = target.renderSkillFrontmatter(workflow);
      files.push({
        toolId,
        toolLabel: target.label,
        workflowId: workflow.id,
        kind: "skill",
        relPath: target.skillFile(workflow.id),
        freshHead: renderManagedHead(skillFrontmatter, workflow.body),
      });

      const commandPath = target.commandFile(workflow.id);
      if (commandPath !== undefined) {
        const commandFrontmatter = target.renderCommandFrontmatter(workflow);
        files.push({
          toolId,
          toolLabel: target.label,
          workflowId: workflow.id,
          kind: "command",
          relPath: commandPath,
          freshHead: renderManagedHead(commandFrontmatter, workflow.body),
        });
      }

      invocations.push({ workflowId: workflow.id, invocation: target.invocation(workflow.id) });
    }

    hosts.push({ toolId, toolLabel: target.label, invocations });
  }

  return { files, hosts };
}
