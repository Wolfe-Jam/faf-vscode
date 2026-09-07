import * as vscode from 'vscode';
import { SYNC_COMMAND } from '../commands';

export { SYNC_COMMAND };

const TERMINAL_NAME = 'FAF Sync';

// `faf sync` writes files in both directions (.faf <-> CLAUDE.md) and is not
// exported as a pure function — a user-initiated write belongs in a visible
// terminal, not a silent in-process call. npx resolves for every VS Code user
// (Node ships with the editor's typical toolchain); the watcher picks up the
// resulting file changes, so there is no follow-up refresh here.
const SYNC_CMDLINE = 'npx --yes faf-cli sync';

/** Open a terminal in the workspace root and run `faf sync`. */
export function runSync(root: string | undefined): void {
  const existing = vscode.window.terminals.find((t) => t.name === TERMINAL_NAME);
  const terminal =
    existing ??
    vscode.window.createTerminal({ name: TERMINAL_NAME, cwd: root });
  terminal.show();
  terminal.sendText(SYNC_CMDLINE);
}
