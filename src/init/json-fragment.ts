import type { JsonFragment } from "../hosts/layouts.js";

/**
 * Editing one key inside a JSON file somebody else owns.
 *
 * Every other file `lambda init` writes is one RecursivePraxis created and may
 * therefore replace: a Markdown body carries managed markers so a hand-edit
 * after them survives, and a whole-file JSON asset lands somewhere only we
 * write. Neither applies to `<proj>/.mcp.json`, `.cursor/mcp.json`, or
 * `opencode.json`. Those hold *all* of a user's MCP servers next to unrelated
 * settings, so the only safe operation is to set or clear a single value and
 * leave every byte of the surrounding document alone.
 *
 * The functions here are pure and total: they take text and return text, and
 * they refuse rather than guess. `write.ts`, `uninstall.ts`, and `inspect.ts`
 * all route through them so there is one definition of what "our entry" means.
 */

/** Formatting the repo uses for every JSON file it writes. */
function serialize(document: unknown): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

/**
 * A document that is a JSON object, or `undefined` if it is anything else.
 *
 * Arrays and primitives are valid JSON but cannot carry a keyed entry, so they
 * are rejected for the same reason a syntax error is: we do not understand the
 * file, and a file we do not understand is one we must not write.
 */
export function parseDocument(text: string): Record<string, unknown> | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined;
  return parsed as Record<string, unknown>;
}

/** The value at `pointer`, or `undefined` if any step of the path is absent. */
export function readAt(
  document: Record<string, unknown>,
  pointer: readonly string[],
): unknown {
  let cursor: unknown = document;
  for (const key of pointer) {
    if (typeof cursor !== "object" || cursor === null || Array.isArray(cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return cursor;
}

/**
 * A copy of `document` with `value` set at `pointer`, creating containers as
 * needed. Anything already on the path that is not an object is replaced —
 * a scalar cannot hold a child, and there is no correct merge with one.
 */
export function writeAt(
  document: Record<string, unknown>,
  pointer: readonly string[],
  value: unknown,
): Record<string, unknown> {
  if (pointer.length === 0) return document;

  const [head, ...rest] = pointer as [string, ...string[]];
  const next = { ...document };

  if (rest.length === 0) {
    next[head] = value;
    return next;
  }

  const child = next[head];
  const container =
    typeof child === "object" && child !== null && !Array.isArray(child)
      ? (child as Record<string, unknown>)
      : {};
  next[head] = writeAt(container, rest, value);
  return next;
}

/**
 * A copy of `document` with `pointer` removed, and with any container our
 * removal emptied removed too.
 *
 * Pruning matters because the container is usually ours in spirit: a user who
 * never had an `mcpServers` key should not be left with an empty one as a
 * souvenir of an uninstall. A container that still holds someone else's server
 * is kept, because then it was never only ours.
 */
export function deleteAt(
  document: Record<string, unknown>,
  pointer: readonly string[],
): Record<string, unknown> {
  if (pointer.length === 0) return document;

  const [head, ...rest] = pointer as [string, ...string[]];
  if (!(head in document)) return document;

  const next = { ...document };

  if (rest.length === 0) {
    delete next[head];
    return next;
  }

  const child = next[head];
  if (typeof child !== "object" || child === null || Array.isArray(child)) return document;

  const pruned = deleteAt(child as Record<string, unknown>, rest);
  if (Object.keys(pruned).length === 0) {
    delete next[head];
  } else {
    next[head] = pruned;
  }
  return next;
}

export type FragmentOutcome =
  | { readonly kind: "unchanged"; readonly text: string }
  | { readonly kind: "updated"; readonly text: string }
  /** The file exists but is not a JSON object. Never written. */
  | { readonly kind: "unparseable" };

/**
 * The text this file should have once our entry is present.
 *
 * `existing` is `null` when the file does not exist, in which case a new
 * document containing only our entry is returned.
 */
export function applyFragment(existing: string | null, fragment: JsonFragment): FragmentOutcome {
  const document = existing === null ? {} : parseDocument(existing);
  if (document === undefined) return { kind: "unparseable" };

  const next = writeAt(document, fragment.pointer, fragment.value);
  const text = serialize(next);
  return text === existing ? { kind: "unchanged", text } : { kind: "updated", text };
}

/** The text this file should have once our entry is gone. */
export function removeFragment(existing: string, fragment: JsonFragment): FragmentOutcome {
  const document = parseDocument(existing);
  if (document === undefined) return { kind: "unparseable" };

  const next = deleteAt(document, fragment.pointer);
  const text = serialize(next);
  return text === existing ? { kind: "unchanged", text } : { kind: "updated", text };
}

/** Whether the file's entry at `pointer` is exactly what we would write. */
export function fragmentMatches(existing: string, fragment: JsonFragment): boolean {
  const document = parseDocument(existing);
  if (document === undefined) return false;
  const actual = readAt(document, fragment.pointer);
  if (actual === undefined) return false;
  return JSON.stringify(actual) === JSON.stringify(fragment.value);
}

/** Whether the file has any entry at `pointer` at all. */
export function fragmentPresent(existing: string, fragment: JsonFragment): boolean {
  const document = parseDocument(existing);
  if (document === undefined) return false;
  return readAt(document, fragment.pointer) !== undefined;
}
