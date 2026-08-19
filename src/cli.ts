#!/usr/bin/env node

import {
  allOperatorNames,
  formatAuthoredLambda,
  lookupOperator,
} from "./vocab/operators.js";
import { checkForbiddenSequence } from "./vocab/grammar.js";

const VERSION = "0.0.0";

const RESERVED_VERBS = ["record", "validate", "score", "revise"] as const;

type ReservedVerb = (typeof RESERVED_VERBS)[number];

function isReservedVerb(value: string): value is ReservedVerb {
  return (RESERVED_VERBS as readonly string[]).includes(value);
}

function printHelp(): void {
  const lines = [
    "lambda — RecursivePraxis CLI",
    "",
    "Usage:",
    "  lambda --help | -h",
    "  lambda --version | -v",
    "  lambda operators list",
    "  lambda operators show <Op>",
    "  lambda check <Op> [<Op>…]",
    "  lambda <verb>",
    "",
    "Vocabulary:",
    "  operators  — list / show CORE alphabet (authored λ)",
    "  check      — hard-reject CORE forbidden sequences",
    "",
    "Reserved verbs (not implemented):",
    "  record    — not implemented",
    "  validate  — not implemented",
    "  score     — not implemented",
    "  revise    — not implemented",
    "",
    "Fail-closed: reserved verbs and unimplemented surfaces exit non-zero",
    "and emit no scores or quarry λ_effective.",
  ];
  console.log(lines.join("\n"));
}

function printVersion(): void {
  console.log(VERSION);
}

function failNotImplemented(verb: string): never {
  console.error(`${verb} is not implemented`);
  process.exit(1);
}

function failUnknown(command: string): never {
  console.error(`unknown command: ${command}`);
  process.exit(1);
}

function runOperators(args: string[]): void {
  const [action, name, ...rest] = args;

  if (action === "list") {
    if (rest.length > 0 || name !== undefined) {
      console.error("usage: lambda operators list");
      process.exit(1);
    }
    for (const opName of allOperatorNames()) {
      console.log(opName);
    }
    process.exit(0);
  }

  if (action === "show") {
    if (!name || rest.length > 0) {
      console.error("usage: lambda operators show <Op>");
      process.exit(1);
    }
    const op = lookupOperator(name);
    if (!op) {
      console.error(`unknown operator: ${name}`);
      process.exit(1);
    }
    console.log(
      [
        `name: ${op.name}`,
        `class: ${op.className}`,
        formatAuthoredLambda(op),
      ].join("\n"),
    );
    process.exit(0);
  }

  console.error("usage: lambda operators list | show <Op>");
  process.exit(1);
}

function runCheck(rawOps: string[]): void {
  if (rawOps.length === 0) {
    console.error("usage: lambda check <Op> [<Op>…]");
    process.exit(1);
  }

  const resolved: string[] = [];
  for (const raw of rawOps) {
    const op = lookupOperator(raw);
    if (!op) {
      console.error(`unknown operator: ${raw}`);
      process.exit(1);
    }
    resolved.push(op.name);
  }

  const result = checkForbiddenSequence(resolved);
  if (result.accepted) {
    console.log(`accept: ${resolved.join(" → ")}`);
    process.exit(0);
  }

  console.error(`${result.reason} [${result.constraint}]`);
  process.exit(1);
}

function main(argv: string[]): void {
  const args = argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const [first, ...rest] = args;

  if (first === "--help" || first === "-h") {
    printHelp();
    process.exit(0);
  }

  if (first === "--version" || first === "-v") {
    printVersion();
    process.exit(0);
  }

  if (first === "operators") {
    runOperators(rest);
  }

  if (first === "check") {
    runCheck(rest);
  }

  if (first === "sequence") {
    failNotImplemented("sequence");
  }

  if (isReservedVerb(first)) {
    failNotImplemented(first);
  }

  failUnknown(first!);
}

main(process.argv);
