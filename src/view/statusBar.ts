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
    // Raw brand hex for the top four tiers (see model.ts TIER_HEX). Checked for
    // legibility across Dark+, Light+, and both high-contrast themes: the
    // orange (#FF6B35) and cyan (#00D4D4) read clearly; cyanDeep (#0E8C8C,
    // Bronze) is the quietest but still legible on a short glyph+score label,
    // and the tooltip repeats the tier in theme-default text. Kept as hex
    // deliberately — the tier colour is a FAF brand signal, and there is no
    // semantic ThemeColor for "status-bar item foreground by grade".
    this.item.color = outcome.tierHex ?? undefined;
    this.shownText = text;
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}
