import * as vscode from 'vscode';
import { renderProjectHtml } from '../engine';
import type { FafViewModel } from '../model';
import { OPEN_CARD_COMMAND } from '../commands';

export { OPEN_CARD_COMMAND };

const VIEW_TYPE = 'faf-context.card';

// faf-cli's `generateProjectHtml` is a self-contained static document: inline
// `<style>` only, no `<script>`, no external `src`/`href`, no `data:` URIs.
// `default-src 'none'` locks everything down; `style-src 'unsafe-inline'` allows
// the one inline stylesheet + the handful of inline `style=` attributes;
// `img-src data:` is precautionary (the current template ships no images).
const CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:;";

/** Matches the opening `<head>` tag, with or without attributes. */
const HEAD_OPEN = /<head[^>]*>/i;

/**
 * Splice a strict Content-Security-Policy `<meta>` in as the first child of
 * `<head>`. Pure — string in, string out. faf-cli's renderer always emits a
 * `<head>`; if that ever changes we throw rather than hand back an
 * unprotected webview.
 */
export function injectCsp(html: string): string {
  if (!HEAD_OPEN.test(html)) {
    throw new Error('context card HTML has no <head> — cannot apply a CSP');
  }
  const meta = `<meta http-equiv="Content-Security-Policy" content="${CSP}">`;
  return html.replace(HEAD_OPEN, (head) => `${head}\n${meta}`);
}

/** The single reused context-card panel. */
let panel: vscode.WebviewPanel | undefined;

/**
 * Render the context card in a webview beside the editor. Reuses the panel if
 * it is already open; disposes cleanly.
 */
export function showCard(vm: FafViewModel, fafPath: string): void {
  const title = `FAF — ${vm.projectName}`;
  const html = injectCsp(renderProjectHtml(fafPath));

  if (panel) {
    panel.title = title;
    panel.webview.html = html;
    panel.reveal(vscode.ViewColumn.Beside);
    return;
  }

  panel = vscode.window.createWebviewPanel(
    VIEW_TYPE,
    title,
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
    { enableScripts: false, retainContextWhenHidden: false },
  );
  panel.webview.html = html;
  panel.onDidDispose(() => {
    panel = undefined;
  });
}

/** Re-render the card in place if it is open (used by the watcher). */
export function refreshCard(fafPath: string): void {
  if (panel) {
    panel.webview.html = injectCsp(renderProjectHtml(fafPath));
  }
}

/** Dispose + forget the card panel. Called on `deactivate`; also a test seam. */
export function disposeCard(): void {
  panel?.dispose();
  panel = undefined;
}
