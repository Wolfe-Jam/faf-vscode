import * as vscode from 'vscode';
import { fafOutput, disposeFafOutput } from './channel';
import { scoreWorkspace } from './engine';
import { isViewModel, type FafOutcome } from './model';
import { createWatcher } from './watch';
import { StatusBarController, REFRESH_COMMAND } from './view/statusBar';
import { HudTreeProvider, HUD_VIEW_ID } from './view/sidebar';
import { showCard, refreshCard, disposeCard, OPEN_CARD_COMMAND } from './view/card';
import { runSync, SYNC_COMMAND } from './view/sync';
import { revealSlot, REVEAL_SLOT_COMMAND } from './view/reveal';
import { FafCodeLensProvider } from './view/codelens';
import { runBundledFaf, ensureTrusted } from './faf/run';
import {
  HAS_FAF_CONTEXT,
  INIT_COMMAND,
  OPEN_FAF_COMMAND,
  SHOW_DNA_COMMAND,
} from './commands';
import type { FafExtensionApi } from './api';

export type { FafExtensionApi };

/**
 * Wire the HUD: output channel, status-bar item, sidebar tree, the file
 * watcher, and the commands. One score pass on activation, then the watcher
 * drives every refresh. Everything lands in `context.subscriptions`.
 */
export function activate(context: vscode.ExtensionContext): FafExtensionApi {
  const channel = fafOutput();
  const statusBar = new StatusBarController();
  const hud = new HudTreeProvider();
  const codeLens = new FafCodeLensProvider();

  let current: FafOutcome = { kind: 'no-workspace' };

  const root = (): string | undefined =>
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  /**
   * Re-score + repaint. `fafChanged` gates the context-card re-render: a
   * `CLAUDE.md`-only touch leaves the card's source unchanged, so skip it
   * unless `project.faf` changed or the score actually moved.
   */
  const refresh = (fafChanged = true): void => {
    const prev = current;
    current = scoreWorkspace(root());
    statusBar.render(current);
    hud.refresh(current);
    codeLens.setModel(current);
    void vscode.commands.executeCommand(
      'setContext',
      HAS_FAF_CONTEXT,
      isViewModel(current),
    );
    if (isViewModel(current)) {
      const prevScore = isViewModel(prev) ? prev.score : undefined;
      if (fafChanged || current.score !== prevScore) {
        refreshCard(current);
      }
    }
    report(channel, current);
  };

  context.subscriptions.push(
    { dispose: disposeFafOutput },
    statusBar,
    hud,
    codeLens,
    vscode.window.registerTreeDataProvider(HUD_VIEW_ID, hud),
    vscode.languages.registerCodeLensProvider(
      { pattern: '**/project.faf' },
      codeLens,
    ),
    vscode.commands.registerCommand(REFRESH_COMMAND, () => refresh()),
    vscode.commands.registerCommand(OPEN_CARD_COMMAND, () => {
      if (isViewModel(current)) {
        showCard(current, current.sourcePath);
      } else {
        void vscode.window.showInformationMessage(
          'No project.faf in this workspace to render.',
        );
      }
    }),
    vscode.commands.registerCommand(OPEN_FAF_COMMAND, async () => {
      if (!isViewModel(current)) {
        void vscode.window.showInformationMessage(
          'No project.faf yet — run FAF: Initialize project.faf.',
        );
        return;
      }
      const doc = await vscode.workspace.openTextDocument(current.sourcePath);
      await vscode.window.showTextDocument(doc);
    }),
    vscode.commands.registerCommand(SYNC_COMMAND, async () => {
      await runSync(context.extensionPath, root());
      refresh();
    }),
    vscode.commands.registerCommand(INIT_COMMAND, async () => {
      const r = root();
      if (!r) {
        void vscode.window.showInformationMessage(
          'Open a folder to author a project.faf.',
        );
        return;
      }
      if (!ensureTrusted()) {
        return;
      }
      const { code } = await runBundledFaf(
        context.extensionPath,
        ['init', '--yolo'],
        { cwd: r, title: 'Authoring project.faf…' },
      );
      refresh();
      if (code !== 0) {
        void vscode.window.showWarningMessage(
          'FAF init did not complete — see the FAF — Project Context output.',
        );
      }
    }),
    vscode.commands.registerCommand(SHOW_DNA_COMMAND, async () => {
      const r = root();
      if (!r || !isViewModel(current)) {
        void vscode.window.showInformationMessage(
          'No project.faf in this workspace — nothing to show.',
        );
        return;
      }
      if (!ensureTrusted()) {
        return;
      }
      channel.show(true);
      await runBundledFaf(context.extensionPath, ['dna'], {
        cwd: r,
        title: 'Reading the DNA journey…',
      });
    }),
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
  // VS Code disposes everything in context.subscriptions; the card panel and
  // the shared output channel are module-level state that outlives them.
  disposeCard();
  disposeFafOutput();
}

function report(channel: vscode.OutputChannel, outcome: FafOutcome): void {
  if (!isViewModel(outcome)) {
    channel.appendLine(
      outcome.kind === 'no-workspace'
        ? 'FAF: no workspace folder open.'
        : 'FAF: no project.faf found — run FAF: Initialize project.faf to author one.',
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
