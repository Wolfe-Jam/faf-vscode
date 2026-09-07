import * as vscode from 'vscode';
import { scoreWorkspace } from './engine';
import { isViewModel, type FafOutcome } from './model';
import { StatusBarController, REFRESH_COMMAND } from './view/statusBar';

/**
 * Wire the status-bar HUD: an output channel, the status-bar item, the refresh
 * command, and one score pass. Everything lands in `context.subscriptions`.
 */
export function activate(context: vscode.ExtensionContext): void {
  const channel = vscode.window.createOutputChannel('FAF — Project Context');
  const statusBar = new StatusBarController();

  const refresh = (): void => {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const outcome = scoreWorkspace(root);
    statusBar.render(outcome);
    report(channel, outcome);
  };

  context.subscriptions.push(
    channel,
    statusBar,
    vscode.commands.registerCommand(REFRESH_COMMAND, refresh),
  );

  refresh();
}

export function deactivate(): void {
  // VS Code disposes everything pushed to context.subscriptions.
}

function report(channel: vscode.OutputChannel, outcome: FafOutcome): void {
  if (!isViewModel(outcome)) {
    channel.appendLine(
      outcome.kind === 'no-workspace'
        ? 'FAF: no workspace folder open.'
        : 'FAF: no project.faf found — run `faf init` to author one.',
    );
    return;
  }
  const next = outcome.nextTier
    ? ` · ${outcome.nextTier.gap} to ${outcome.nextTier.name}`
    : '';
  channel.appendLine(
    `FAF: ${outcome.sourcePath} — ${outcome.score}% ${outcome.tierName}${next}`,
  );
}
