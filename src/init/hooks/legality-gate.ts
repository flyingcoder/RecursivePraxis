import { Hook } from "../assets/DataAsset.js";

export default new Hook({
  slug: "legality-gate",
  title: "RecursivePraxis: legality gate",
  description:
    "Blocks a `lambda step --op <Operator>` shell call the kernel does not currently list in `legalNext` — the sequence grammar (hard constraints in Mode 1, the HALIRA program counter in Mode 2) enforced before the shell round-trip, not just after it.",
  event: "PreToolUse",
  matcher: "Bash",
  command: "lambda gate",
});
