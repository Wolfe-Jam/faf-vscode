import * as vscode from 'vscode';
import { scoreWorkspace } from './engine';
import { isViewModel, type FafOutcome } from './model';
import { createWatcher } from './watch';
import { StatusBarController, REFRESH_COMMAND } from './view/statusBar';
import { HudTreeProvider, HUD_VIEW_ID } from './view/sidebar';
import { showCard, refreshCard, OPEN_CARD_COMMAND } from './view/card';
import { runSync, SYNC_COMMAND } from './view/sync';
import { revealSlot, REVEAL_SLOT_COMMAND } from './view/reveal';

/** The API `activate` returns — a test seam, harmless in production. */
export interface FafExtensionApi {
  statusBarText(): string | undefined;
  hud: HudTreeProvider;
  outcome(): FafOutcome;
}

/**
 * Wire the HUD: output channel, status-bar item, sidebar tree, the file
 * watcher, and the commands. One score pass on activation, then the watcher
 * drives every refresh. Everything lands in `context.subscriptions`.
 */
export function activate(context: vscode.ExtensionContext): FafExtensionApi {
  const channel = vscode.window.createOutputChannel('FAF — Project Context');
  const statusBar = new StatusBarController();
  const hud = new HudTreeProvider();

  let current: FafOutcome = { kind: 'no-workspace' };

  const root = (): string | undefined =>
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  const refresh = (): void => {
    current = scoreWorkspace(root());
    statusBar.render(current);
    hud.refresh(current);
    if (isViewModel(current)) {
      refreshCard(current.sourcePath);
    }
    report(channel, current);
  };

  context.subscriptions.push(
    channel,
    statusBar,
    hud,
    vscode.window.registerTreeDataProvider(HUD_VIEW_ID, hud),
    vscode.commands.registerCommand(REFRESH_COMMAND, refresh),
    vscode.commands.registerCommand(OPEN_CARD_COMMAND, () => {
      if (isViewModel(current)) {
        showCard(current, current.sourcePath);
      } else {
        void vscode.window.showInformationMessage(
          'No project.faf in this workspace to render.',
        );
      }
    }),
    vscode.commands.registerCommand(SYNC_COMMAND, () => runSync(root())),
    vscode.commands.registerCommand(
      REVEAL_SLOT_COMMAND,
      (fafPath: string, slotPath: string) => revealSlot(fafPath, slotPath),
    ),
  );

  const ws = root();
  if (ws) {
    context.subscriptions.push(createWatcher(ws, refresh));
  }

  refresh();

  return {
    statusBarText: () => statusBar.currentText,
    hud,
    outcome: () => current,
  };
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
  const drift = outcome.drift
    ? ` · drift ${outcome.drift.drifted} / missing ${outcome.drift.missing}`
    : '';
  channel.appendLine(
    `FAF: ${outcome.sourcePath} — ${outcome.score}% ${outcome.tierName}${next}${drift}`,
  );
}
