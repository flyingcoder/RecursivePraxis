import readline from "node:readline";

/**
 * The port every wizard step talks through.
 *
 * `--tools` / `--scope` are not a second implementation of `init`; they are a
 * `WizardIO`. That is the whole reason this interface exists: with a parallel
 * non-interactive code path, the scripted and interactive forms would drift
 * apart silently, and only one of them would be covered by tests.
 */

export interface Choice {
  readonly value: string;
  readonly label: string;
  /** Parenthetical shown after the label — detection evidence, usually. */
  readonly hint: string | undefined;
  readonly selected: boolean;
}

export interface EvidenceRow {
  readonly label: string;
  readonly status: string;
  readonly evidence: string;
}

export interface Question {
  /** The flag that pre-answers this question. Named verbatim in errors. */
  readonly flag: string;
  readonly prompt: string;
  readonly options: readonly Choice[];
}

export interface SingleSelectQuestion extends Question {
  /**
   * Value used when the flag is absent and there is nobody to ask. Present
   * only for questions with a documented default; a question without one is
   * an error rather than a silent guess.
   */
  readonly fallback: string | undefined;
}

export interface WizardIO {
  note(line: string): void;
  table(rows: readonly EvidenceRow[]): void;
  multiSelect(question: Question): Promise<readonly string[]>;
  singleSelect(question: SingleSelectQuestion): Promise<string>;
}

export class NeedsFlagError extends Error {
  constructor(readonly flag: string, question: string) {
    super(
      `lambda init requires ${flag} when there is no terminal to prompt for it (${question}). Pass the flag explicitly, or run \`lambda init\` from an interactive shell.`,
    );
    this.name = "NeedsFlagError";
  }
}

// --- shared formatting -------------------------------------------------------

function padEnd(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

export function formatTable(rows: readonly EvidenceRow[]): readonly string[] {
  const labelWidth = Math.max(...rows.map((row) => row.label.length), 0);
  const statusWidth = Math.max(...rows.map((row) => row.status.length), 0);
  return rows.map(
    (row) => `  ${padEnd(row.label, labelWidth)}   ${padEnd(row.status, statusWidth)}   ${row.evidence}`,
  );
}

function optionLine(choice: Choice, marker: string, cursor: boolean): string {
  const hint = choice.hint === undefined ? "" : `  (${choice.hint})`;
  return `${cursor ? ">" : " "} ${marker} ${choice.label}${hint}`;
}

// --- interactive -------------------------------------------------------------

/**
 * A real terminal. Keyboard-driven where raw mode is available, and a typed
 * line otherwise — some CI shells report `isTTY` but cannot switch modes, and
 * hanging there would be worse than asking for a comma-separated answer.
 */
export class TtyWizardIO implements WizardIO {
  constructor(
    private readonly input: NodeJS.ReadStream = process.stdin,
    private readonly output: NodeJS.WriteStream = process.stdout,
  ) {}

  note(line: string): void {
    this.output.write(`${line}\n`);
  }

  table(rows: readonly EvidenceRow[]): void {
    for (const line of formatTable(rows)) this.output.write(`${line}\n`);
  }

  async multiSelect(question: Question): Promise<readonly string[]> {
    const selected = new Set(question.options.filter((o) => o.selected).map((o) => o.value));
    if (!this.canUseRawMode()) {
      return this.promptLine(question, [...selected]);
    }
    await this.navigate(question, {
      hintLine: "  space toggles · enter confirms",
      isMarked: (choice) => selected.has(choice.value),
      onSpace: (choice) => {
        if (selected.has(choice.value)) selected.delete(choice.value);
        else selected.add(choice.value);
      },
      marker: (marked) => (marked ? "[x]" : "[ ]"),
    });
    return question.options.filter((o) => selected.has(o.value)).map((o) => o.value);
  }

  async singleSelect(question: SingleSelectQuestion): Promise<string> {
    const initial = question.options.findIndex((o) => o.selected);
    if (!this.canUseRawMode()) {
      const answers = await this.promptLine(question, [
        question.options[initial === -1 ? 0 : initial]!.value,
      ]);
      return answers[0] ?? question.options[0]!.value;
    }
    let chosen = initial === -1 ? 0 : initial;
    await this.navigate(question, {
      hintLine: "  ↑/↓ moves · enter confirms",
      isMarked: (_choice, index) => index === chosen,
      onSpace: (_choice, index) => {
        chosen = index;
      },
      onMove: (index) => {
        chosen = index;
      },
      marker: (marked) => (marked ? "(•)" : "( )"),
      startAt: chosen,
    });
    return question.options[chosen]!.value;
  }

  private canUseRawMode(): boolean {
    return this.input.isTTY === true && typeof this.input.setRawMode === "function";
  }

  /**
   * Shared keyboard loop. Redraws in place by rewinding exactly as many lines
   * as were written, so a long host list does not scroll the evidence table
   * from Step 1 off the screen while the human is still reading it.
   */
  private navigate(
    question: Question,
    spec: {
      hintLine: string;
      isMarked: (choice: Choice, index: number) => boolean;
      onSpace: (choice: Choice, index: number) => void;
      onMove?: (index: number) => void;
      marker: (marked: boolean) => string;
      startAt?: number;
    },
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let cursor = spec.startAt ?? 0;
      let drawnLines = 0;

      const draw = (): void => {
        if (drawnLines > 0) {
          readline.moveCursor(this.output, 0, -drawnLines);
          readline.clearScreenDown(this.output);
        }
        const lines = [
          ...question.options.map((choice, index) =>
            optionLine(choice, spec.marker(spec.isMarked(choice, index)), index === cursor),
          ),
          "",
          spec.hintLine,
        ];
        this.output.write(`${lines.join("\n")}\n`);
        drawnLines = lines.length;
      };

      const cleanup = (): void => {
        this.input.off("keypress", onKeypress);
        if (typeof this.input.setRawMode === "function") this.input.setRawMode(false);
        this.input.pause();
      };

      const onKeypress = (_str: string, key: { name?: string; ctrl?: boolean }): void => {
        if (key.ctrl === true && key.name === "c") {
          cleanup();
          reject(new Error("cancelled"));
          return;
        }
        if (key.name === "up" || key.name === "k") {
          cursor = (cursor - 1 + question.options.length) % question.options.length;
          spec.onMove?.(cursor);
          draw();
          return;
        }
        if (key.name === "down" || key.name === "j") {
          cursor = (cursor + 1) % question.options.length;
          spec.onMove?.(cursor);
          draw();
          return;
        }
        if (key.name === "space") {
          spec.onSpace(question.options[cursor]!, cursor);
          draw();
          return;
        }
        if (key.name === "return" || key.name === "enter") {
          cleanup();
          resolve();
        }
      };

      readline.emitKeypressEvents(this.input);
      this.input.setRawMode?.(true);
      this.input.resume();
      this.input.on("keypress", onKeypress);
      draw();
    });
  }

  /** Line-mode fallback: the same question, answered as a comma-separated list. */
  private promptLine(question: Question, defaults: readonly string[]): Promise<readonly string[]> {
    const rl = readline.createInterface({ input: this.input, output: this.output });
    const valid = new Set(question.options.map((o) => o.value));
    const ask = (): Promise<readonly string[]> =>
      new Promise((resolve) => {
        rl.question(`  [${defaults.join(",")}] > `, (answer) => resolve(answer.split(",")));
      });

    return (async () => {
      for (const choice of question.options) {
        this.output.write(`${optionLine(choice, defaults.includes(choice.value) ? "[x]" : "[ ]", false)}\n`);
      }
      this.output.write("  comma-separated, or enter to accept the defaults\n");
      for (;;) {
        const raw = await ask();
        const tokens = raw.map((token) => token.trim()).filter((token) => token.length > 0);
        if (tokens.length === 0) {
          rl.close();
          return defaults;
        }
        const unknown = tokens.filter((token) => !valid.has(token));
        if (unknown.length === 0) {
          rl.close();
          return question.options.filter((o) => tokens.includes(o.value)).map((o) => o.value);
        }
        this.output.write(`  unknown: ${unknown.join(", ")} — expected ${[...valid].join(", ")}\n`);
      }
    })();
  }
}

// --- non-interactive ---------------------------------------------------------

export type FlagAnswers = Readonly<Record<string, readonly string[] | undefined>>;

/**
 * Every answer pre-supplied by flags. A question with no flag behind it and
 * no documented default throws `NeedsFlagError` naming the exact flag —
 * never a silent default, never a hang on a closed stdin.
 */
export class FlagWizardIO implements WizardIO {
  /** `output` omitted means silent — there is no default stream, because an
   *  explicit `undefined` would otherwise fall back to one and print into a
   *  caller that asked for silence (a `--json` run, most obviously). */
  constructor(
    private readonly answers: FlagAnswers,
    private readonly output?: NodeJS.WriteStream,
  ) {}

  note(line: string): void {
    this.output?.write(`${line}\n`);
  }

  table(rows: readonly EvidenceRow[]): void {
    for (const line of formatTable(rows)) this.output?.write(`${line}\n`);
  }

  async multiSelect(question: Question): Promise<readonly string[]> {
    const answer = this.answers[question.flag];
    if (answer === undefined) throw new NeedsFlagError(question.flag, question.prompt);
    return answer;
  }

  async singleSelect(question: SingleSelectQuestion): Promise<string> {
    const answer = this.answers[question.flag]?.[0] ?? question.fallback;
    if (answer === undefined) throw new NeedsFlagError(question.flag, question.prompt);
    return answer;
  }
}

/**
 * Flags where they were supplied, prompts where they were not.
 *
 * This is what "flags pre-answer their step and skip it" means mechanically:
 * a flag is not a bypass around the wizard, it is an answer handed to it
 * early, so the interactive and scripted forms cannot produce different
 * results from the same inputs.
 */
export class PreAnsweredWizardIO implements WizardIO {
  constructor(
    private readonly answers: FlagAnswers,
    private readonly delegate: WizardIO,
  ) {}

  note(line: string): void {
    this.delegate.note(line);
  }

  table(rows: readonly EvidenceRow[]): void {
    this.delegate.table(rows);
  }

  async multiSelect(question: Question): Promise<readonly string[]> {
    const answer = this.answers[question.flag];
    if (answer === undefined) return this.delegate.multiSelect(question);
    this.delegate.note(`  ${question.flag} supplied: ${answer.length === 0 ? "none" : answer.join(", ")}`);
    return answer;
  }

  async singleSelect(question: SingleSelectQuestion): Promise<string> {
    const answer = this.answers[question.flag]?.[0];
    if (answer === undefined) return this.delegate.singleSelect(question);
    this.delegate.note(`  ${question.flag} supplied: ${answer}`);
    return answer;
  }
}

/** Scripted answers for tests: no TTY, no filesystem, no subprocess. */
export class ScriptedWizardIO implements WizardIO {
  readonly notes: string[] = [];
  readonly tables: (readonly EvidenceRow[])[] = [];
  readonly asked: string[] = [];

  constructor(private readonly script: readonly (readonly string[])[]) {}

  private next(question: Question): readonly string[] {
    const answer = this.script[this.asked.length];
    if (answer === undefined) {
      throw new Error(`ScriptedWizardIO ran out of answers at question ${this.asked.length + 1}: ${question.prompt}`);
    }
    this.asked.push(question.flag);
    return answer;
  }

  note(line: string): void {
    this.notes.push(line);
  }

  table(rows: readonly EvidenceRow[]): void {
    this.tables.push(rows);
  }

  async multiSelect(question: Question): Promise<readonly string[]> {
    return this.next(question);
  }

  async singleSelect(question: SingleSelectQuestion): Promise<string> {
    return this.next(question)[0] ?? question.fallback ?? question.options[0]!.value;
  }

  /** Fails if the wizard asked fewer questions than the script supplied. */
  assertFullyConsumed(): void {
    if (this.asked.length !== this.script.length) {
      throw new Error(
        `ScriptedWizardIO: ${this.script.length} answers supplied but ${this.asked.length} questions asked`,
      );
    }
  }
}
