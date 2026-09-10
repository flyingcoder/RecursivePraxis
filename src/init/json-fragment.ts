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

/**
 * Whether two entries are the same one.
 *
 * An element of a shared array has no key to be addressed by, so its own value
 * is its identity. Both sides are rendered by the same code path
 * (`Hook.toMatcherEntry`), so key order agrees and `JSON.stringify` is a sound
 * deep comparison here — the same test `fragmentMatches` already applies to a
 * keyed entry.
 */
function sameEntry(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The array our entry belongs in, or `undefined` if something that is not an
 * array already occupies `pointer`.
 *
 * An absent pointer is an empty array, not a refusal: the user simply has no
 * hooks for this event yet. A *scalar* there is a refusal, for the reason
 * `parseDocument` refuses a non-object document — we do not understand the file,
 * and appending to something we do not understand would destroy it.
 */
function arrayAt(
  document: Record<string, unknown>,
  pointer: readonly string[],
): readonly unknown[] | undefined {
  const current = readAt(document, pointer);
  if (current === undefined) return [];
  return Array.isArray(current) ? current : undefined;
}

/**
 * A copy of `document` with `value` present in the array at `pointer`, or
 * `document` itself when an equal entry is already there.
 *
 * Appending rather than setting is what keeps a user's own hooks for the same
 * event alive, and the equality check is what keeps a second `init` from
 * stacking a duplicate.
 */
export function appendAt(
  document: Record<string, unknown>,
  pointer: readonly string[],
  value: unknown,
): Record<string, unknown> | undefined {
  const entries = arrayAt(document, pointer);
  if (entries === undefined) return undefined;
  if (entries.some((entry) => sameEntry(entry, value))) return document;
  return writeAt(document, pointer, [...entries, value]);
}

/**
 * A copy of `document` with `value` removed from the array at `pointer`, and
 * with the array — and any container it emptied — removed if nothing of the
 * user's is left in it.
 */
export function removeFromAt(
  document: Record<string, unknown>,
  pointer: readonly string[],
  value: unknown,
): Record<string, unknown> | undefined {
  const entries = arrayAt(document, pointer);
  if (entries === undefined) return undefined;
  const kept = entries.filter((entry) => !sameEntry(entry, value));
  if (kept.length === entries.length) return document;
  return kept.length === 0 ? deleteAt(document, pointer) : writeAt(document, pointer, kept);
}

export type FragmentOutcome =
  | { readonly kind: "unchanged"; readonly text: string }
  | { readonly kind: "updated"; readonly text: string }
  /**
   * The file is not a shape we can safely edit — not a JSON object, or our
   * pointer occupied by a value that cannot hold our entry. Never written.
   */
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

  const next = ((): Record<string, unknown> | undefined => {
    switch (fragment.merge) {
      case "append":
        return appendAt(document, fragment.pointer, fragment.value);
      // Theirs if they have one, ours only if they do not.
      case "ensure":
        return readAt(document, fragment.pointer) === undefined
          ? writeAt(document, fragment.pointer, fragment.value)
          : document;
      case "set":
        return writeAt(document, fragment.pointer, fragment.value);
    }
  })();
  if (next === undefined) return { kind: "unparseable" };

  const text = serialize(next);
  return text === existing ? { kind: "unchanged", text } : { kind: "updated", text };
}

/** The text this file should have once our entry is gone. */
export function removeFragment(existing: string, fragment: JsonFragment): FragmentOutcome {
  const document = parseDocument(existing);
  if (document === undefined) return { kind: "unparseable" };

  const next = ((): Record<string, unknown> | undefined => {
    switch (fragment.merge) {
      case "append":
        return removeFromAt(document, fragment.pointer, fragment.value);
      // Never ours to remove: the rest of the file still needs it.
      case "ensure":
        return document;
      case "set":
        return deleteAt(document, fragment.pointer);
    }
  })();
  if (next === undefined) return { kind: "unparseable" };

  const text = serialize(next);
  return text === existing ? { kind: "unchanged", text } : { kind: "updated", text };
}

/**
 * Whether the file already holds an entry equal to ours.
 *
 * For an appended entry this is the same question as `fragmentPresent`, and
 * deliberately so: an array element is identified by its own value, so a
 * hand-edited copy is a different entry rather than a drifted one. `inspect`
 * therefore reports an appended fragment as `managed` or `missing` and never as
 * `drifted` — the alternative is guessing which of the user's entries used to
 * be ours.
 */
export function fragmentMatches(existing: string, fragment: JsonFragment): boolean {
  const document = parseDocument(existing);
  if (document === undefined) return false;
  if (fragment.merge === "append") return containsEntry(document, fragment);
  const actual = readAt(document, fragment.pointer);
  if (actual === undefined) return false;
  // A schema key is satisfied by existing. We never overwrite one, so a value
  // that is not ours is the host's, not drift in our install.
  if (fragment.merge === "ensure") return true;
  return sameEntry(actual, fragment.value);
}

/** Whether the file has any entry at `pointer` at all. */
export function fragmentPresent(existing: string, fragment: JsonFragment): boolean {
  const document = parseDocument(existing);
  if (document === undefined) return false;
  if (fragment.merge === "append") return containsEntry(document, fragment);
  return readAt(document, fragment.pointer) !== undefined;
}

function containsEntry(document: Record<string, unknown>, fragment: JsonFragment): boolean {
  const entries = arrayAt(document, fragment.pointer);
  return entries !== undefined && entries.some((entry) => sameEntry(entry, fragment.value));
}
