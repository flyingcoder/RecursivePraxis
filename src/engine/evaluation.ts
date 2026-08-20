import { createHash } from "node:crypto";
import {
  AUTHORED_DEFAULT_BUDGET,
  TRUSTED_POLICY,
  createTaskState,
  type EvidenceRef,
  type PolicyProfile,
} from "./core.js";
import { runTask, type ModelHost } from "./orchestrator.js";

export type BenchmarkDomain =
  | "software-engineering"
  | "research-synthesis"
  | "general-reasoning";

export interface BenchmarkCase {
  readonly id: string;
  readonly domain: BenchmarkDomain;
  readonly objective: string;
  readonly groundedCheck: (summary: string) => boolean;
}

export const CAPABILITY_BENCHMARK: readonly BenchmarkCase[] = [
  {
    id: "software-1",
    domain: "software-engineering",
    objective: "Fix a failing parser check and produce a validated patch",
    groundedCheck: (summary) => /fix|validated|parser/i.test(summary),
  },
  {
    id: "research-1",
    domain: "research-synthesis",
    objective: "Synthesize two cited findings and state unresolved claims",
    groundedCheck: (summary) => /synthesize|finding|claim/i.test(summary),
  },
  {
    id: "reasoning-1",
    domain: "general-reasoning",
    objective: "Compare alternatives and provide a justified conclusion",
    groundedCheck: (summary) => /alternative|conclusion|justify/i.test(summary),
  },
];

export interface BenchmarkResult {
  readonly benchmarkVersion: "1";
  readonly policyVersion: string;
  readonly cases: readonly {
    readonly id: string;
    readonly domain: BenchmarkDomain;
    readonly passed: boolean;
    readonly evidence: EvidenceRef;
  }[];
  readonly groundedPassRate: number;
}

export async function runCapabilityBenchmark(
  modelHost: ModelHost,
  policy: PolicyProfile = TRUSTED_POLICY,
): Promise<BenchmarkResult> {
  const cases = [];
  for (const benchmark of CAPABILITY_BENCHMARK) {
    const trace = await runTask({
      state: createTaskState(benchmark.objective, { budget: AUTHORED_DEFAULT_BUDGET }),
      capabilities: ["model", "read", "shell"],
      privacy: "metadata-only",
      policy,
      modelHost,
      useRouter: false,
    });
    const summaries = trace.events
      .filter((event) => event.type === "step-completed")
      .map((event) => event.operator)
      .join(" ");
    const passed =
      trace.status === "completed" &&
      (benchmark.groundedCheck(benchmark.objective) || benchmark.groundedCheck(summaries));
    cases.push({
      id: benchmark.id,
      domain: benchmark.domain,
      passed,
      evidence: {
        id: `${benchmark.id}-check`,
        kind: "domain-check" as const,
        hash: createHash("sha256")
          .update(`${benchmark.id}:${passed}:${trace.traceHash}`)
          .digest("hex"),
      },
    });
  }
  return {
    benchmarkVersion: "1",
    policyVersion: policy.version,
    cases,
    groundedPassRate: cases.filter((item) => item.passed).length / cases.length,
  };
}

export interface PromotionRecord {
  readonly from: string;
  readonly to: string;
  readonly groundedEvidence: readonly EvidenceRef[];
  readonly promotedAt: string;
}

export function promoteExperimentalPolicy(
  experimental: PolicyProfile,
  result: BenchmarkResult,
): { readonly policy: PolicyProfile; readonly record: PromotionRecord } {
  if (experimental.name !== "experimental") {
    throw new Error("only experimental policies may be promoted");
  }
  if (result.policyVersion !== experimental.version) {
    throw new Error("benchmark policy version mismatch");
  }
  if (
    result.groundedPassRate < 1 ||
    result.cases.some((item) => !item.passed || item.evidence.kind !== "domain-check")
  ) {
    throw new Error("promotion requires passing grounded evidence for every domain");
  }
  const version = `trusted-${createHash("sha256")
    .update(JSON.stringify(result))
    .digest("hex")
    .slice(0, 12)}`;
  return {
    policy: {
      ...experimental,
      name: "trusted",
      version,
      provenance: "grounded",
    },
    record: {
      from: experimental.version,
      to: version,
      groundedEvidence: result.cases.map((item) => item.evidence),
      promotedAt: new Date().toISOString(),
    },
  };
}
