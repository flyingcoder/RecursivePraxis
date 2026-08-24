import type { WizardIO } from "../WizardIO.js";

/**
 * One of exactly four steps. The ordinal is printed ("Step 2/4"), so a fifth
 * step cannot be added without the count in front of the human changing —
 * which is the point: the shape of `init` is meant to be provable by reading
 * one method.
 */
export const TOTAL_STEPS = 4;

export abstract class InitStep<In, Out> {
  abstract readonly ordinal: number;
  abstract readonly title: string;

  abstract run(input: In, io: WizardIO): Promise<Out>;

  protected announce(io: WizardIO): void {
    io.note("");
    io.note(`Step ${this.ordinal}/${TOTAL_STEPS} — ${this.title}`);
    io.note("");
  }
}
