import * as vscode from 'vscode';
import { SYNC_COMMAND } from '../commands';
import { ensureTrusted, resolveFafCli, runBundledFaf } from '../faf/run';

export { SYNC_COMMAND };

const TERMINAL_NAME = 'FAF Sync';

/**
 * Run `faf sync --direction auto` with the bundled CLI on VS Code's own Node.
 * `.faf ↔ CLAUDE.md` bi-sync, mtime auto-direction. The file watcher picks up
 * the writes; the command handler also triggers a refresh.
 *
 * Falls back to an `npx` terminal only when the bundled CLI genuinely cannot be
 * resolved — with an honest message that it now needs Node on PATH.
 */
export async function runSync(
  extensionPath: string,
  root: string | undefined,
): Promise<void> {
  if (!root) {
    void vscode.window.showInformationMessage(
      'Open a folder to sync its context files.',
    );
    return;
  }
  if (!ensureTrusted()) {
    return;
  }

  try {
    resolveFafCli(extensionPath);
  } catch {
    fallbackToTerminal(root);
    return;
  }

  const { code } = await runBundledFaf(
    extensionPath,
    ['sync', '--direction', 'auto'],
    { cwd: root, title: 'Syncing context files…' },
  );
  if (code !== 0) {
    void vscode.window.showWarningMessage(
      'FAF sync did not complete — see the FAF — Project Context output.',
    );
  }
}

/** Last resort: the bundled CLI is missing, so shell out to npx. */
function fallbackToTerminal(root: string): void {
  void vscode.window.showWarningMessage(
    'Bundled faf-cli not found — falling back to `npx faf-cli` (needs Node on your PATH).',
  );
  const existing = vscode.window.terminals.find((t) => t.name === TERMINAL_NAME);
  const terminal =
    existing ?? vscode.window.createTerminal({ name: TERMINAL_NAME, cwd: root });
  terminal.show();
  terminal.sendText('npx --yes faf-cli sync --direction auto');
}
