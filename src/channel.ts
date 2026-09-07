import * as vscode from 'vscode';

/**
 * The single shared output channel. Both the score reporter (`extension.ts`) and
 * the CLI runner (`faf/run.ts`) write here, so it must be one instance —
 * `createOutputChannel` with the same name twice would make two panels.
 */
let channel: vscode.OutputChannel | undefined;

export function fafOutput(): vscode.OutputChannel {
  return (channel ??= vscode.window.createOutputChannel('FAF — Project Context'));
}

/** Dispose + forget the channel. Wired into `context.subscriptions` + `deactivate`. */
export function disposeFafOutput(): void {
  channel?.dispose();
  channel = undefined;
}
