import * as vscode from 'vscode';
import { readFafRaw } from 'faf-cli';
import { REVEAL_SLOT_COMMAND } from '../commands';

export { REVEAL_SLOT_COMMAND };

/**
 * Open `project.faf` and put the cursor on a slot's line. Best-effort: scan the
 * raw YAML for the dot-path's leaf key; if it is not found, open the file at the
 * top. Phase 3 polishes this into real path-aware navigation.
 */
export async function revealSlot(fafPath: string, slotPath: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(fafPath);
  const line = findLeafKeyLine(readFafRaw(fafPath), slotPath);
  const pos = new vscode.Position(line, 0);
  await vscode.window.showTextDocument(doc, {
    selection: new vscode.Range(pos, pos),
    preserveFocus: false,
  });
}

/** Line index (0-based) of a dot-path's leaf key, or 0 when not found. */
export function findLeafKeyLine(raw: string, slotPath: string): number {
  const leaf = slotPath.split('.').pop();
  if (!leaf) {
    return 0;
  }
  const lines = raw.split('\n');
  const keyRe = new RegExp(`^\\s*${escapeRe(leaf)}\\s*:`);
  for (let i = 0; i < lines.length; i++) {
    if (keyRe.test(lines[i]!)) {
      return i;
    }
  }
  return 0;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
