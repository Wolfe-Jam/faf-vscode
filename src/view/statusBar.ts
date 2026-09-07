import * as vscode from 'vscode';
import { formatStatusBar, isViewModel, type FafOutcome } from '../model';
import { OPEN_CARD_COMMAND, REFRESH_COMMAND } from '../commands';

export { REFRESH_COMMAND };

/**
 * Owns the single status-bar item. `render` is the only entry point: hand it an
 * outcome and it updates or hides the item.
 */
export class StatusBarController {
  private readonly item: vscode.StatusBarItem;
  private shownText: string | undefined;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.item.command = OPEN_CARD_COMMAND;
  }

  /** The label currently shown, or `undefined` when the item is hidden. */
  get currentText(): string | undefined {
    return this.shownText;
  }

  render(outcome: FafOutcome): void {
    if (!isViewModel(outcome)) {
      this.shownText = undefined;
      this.item.hide();
      return;
    }
    const { text, tooltip } = formatStatusBar(outcome);
    this.item.text = text;
    this.item.tooltip = tooltip;
    this.item.color = outcome.tierHex ?? undefined;
    this.shownText = text;
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}
