import { compileIR, renderIRMarkdown } from "../ir/compile.js";
import { loadSession } from "../cli-support/session-store.js";

export async function runIr(baseDir: string, json: boolean): Promise<void> {
  const session = await loadSession(baseDir);
  const ir = compileIR(session);

  if (json) {
    console.log(JSON.stringify(ir, null, 2));
    process.exit(0);
  }

  console.log(renderIRMarkdown(ir));
  process.exit(0);
}
