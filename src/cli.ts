#!/usr/bin/env node

const VERSION = "0.0.0";

const RESERVED_VERBS = ["record", "validate", "score", "revise"] as const;

type ReservedVerb = (typeof RESERVED_VERBS)[number];

function isReservedVerb(value: string): value is ReservedVerb {
  return (RESERVED_VERBS as readonly string[]).includes(value);
}

function printHelp(): void {
  const lines = [
    "lambda — RecursivePraxis CLI (stub)",
    "",
    "Usage:",
    "  lambda --help | -h",
    "  lambda --version | -v",
    "  lambda <verb>",
    "",
    "Reserved verbs (not implemented):",
    "  record    — not implemented",
    "  validate  — not implemented",
    "  score     — not implemented",
    "  revise    — not implemented",
    "",
    "This stub is fail-closed: reserved verbs exit non-zero and emit no scores.",
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

function main(argv: string[]): void {
  const args = argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const [first] = args;

  if (first === "--help" || first === "-h") {
    printHelp();
    process.exit(0);
  }

  if (first === "--version" || first === "-v") {
    printVersion();
    process.exit(0);
  }

  if (isReservedVerb(first)) {
    failNotImplemented(first);
  }

  failUnknown(first);
}

main(process.argv);
