import { Hook } from "../assets/DataAsset.js";

export default new Hook({
  slug: "context-injection",
  title: "RecursivePraxis: context injection",
  description:
    "Prepends the current session's mode, attractor, λ_eff, and legalNext operators to every turn, so the agent is told the state transition it is in rather than trusted to remember it. Never blocks — an illegal operator is the legality gate's job, not this one's.",
  event: "UserPromptSubmit",
  command: "lambda inject",
});
