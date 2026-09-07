import * as vscode from 'vscode';
import { formatStatusBar, isViewModel, type FafOutcome } from '../model';

/** The `faf-context.refresh` command id — also wired in package.json. */
export const REFRESH_COMMAND = 'faf-context.refresh';

/**
 * Owns the single status-bar item. `render` is the only entry point: hand it an
 * outcome and it updates or hides the item.
 */
export class StatusBarController {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.item.command = REFRESH_COMMAND;
  }

  render(outcome: FafOutcome): void {
    if (!isViewModel(outcome)) {
      this.item.hide();
      return;
    }
    const { text, tooltip } = formatStatusBar(outcome);
    this.item.text = text;
    this.item.tooltip = tooltip;
    this.item.color = outcome.tierHex ?? undefined;
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}
