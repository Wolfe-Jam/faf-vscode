import * as vscode from 'vscode';
import { readFafRaw } from 'faf-cli';
import { REVEAL_SLOT_COMMAND } from '../commands';

export { REVEAL_SLOT_COMMAND };

/**
 * Open `project.faf` and put the cursor on a slot's line. Best-effort: if the
 * dotted path can't be walked, fall back to the deepest segment we did find (or
 * the top of the file).
 */
export async function revealSlot(fafPath: string, slotPath: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(fafPath);
  const line = findSlotLine(readFafRaw(fafPath), slotPath);
  const pos = new vscode.Position(line, 0);
  await vscode.window.showTextDocument(doc, {
    selection: new vscode.Range(pos, pos),
    preserveFocus: false,
  });
}

const INDENT_RE = /^\s*/;

/** Visible indent width of a line (tabs counted as one). */
function indentOf(line: string): number {
  return INDENT_RE.exec(line)![0].length;
}

/** A line that carries no key — blank or a comment. */
function isSkippable(line: string): boolean {
  const t = line.trim();
  return t.length === 0 || t.startsWith('#');
}

/**
 * Line index (0-based) of a dotted slot path's leaf key, walking the segments
 * with indentation awareness so `stack.build` lands on the `build:` *inside the
 * `stack:` block* — not a `build:` under `project:` or a top-level one.
 *
 * Returns the last segment matched (the section header if the leaf is absent),
 * or 0 when nothing matched at all.
 */
export function findSlotLine(raw: string, dotPath: string): number {
  const segments = dotPath.split('.').filter(Boolean);
  if (segments.length === 0) {
    return 0;
  }
  const lines = raw.split('\n');

  let windowStart = 0;
  let windowEnd = lines.length;
  let parentIndent = -1;
  let result = 0;
  let matchedAny = false;

  for (const seg of segments) {
    const keyRe = new RegExp(`^(\\s*)${escapeRe(seg)}\\s*:`);
    let found = -1;
    let foundIndent = -1;

    for (let i = windowStart; i < windowEnd; i++) {
      const line = lines[i]!;
      if (isSkippable(line)) {
        continue;
      }
      const indent = indentOf(line);
      if (indent <= parentIndent) {
        break; // left the parent block
      }
      if (keyRe.test(line)) {
        found = i;
        foundIndent = indent;
        break;
      }
    }

    if (found === -1) {
      return matchedAny ? result : 0;
    }

    matchedAny = true;
    result = found;
    parentIndent = foundIndent;
    windowStart = found + 1;

    // Narrow the window to this key's own block: up to the next line whose
    // indent is <= this key's.
    let end = windowEnd;
    for (let i = found + 1; i < windowEnd; i++) {
      const line = lines[i]!;
      if (isSkippable(line)) {
        continue;
      }
      if (indentOf(line) <= foundIndent) {
        end = i;
        break;
      }
    }
    windowEnd = end;
  }

  return result;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
