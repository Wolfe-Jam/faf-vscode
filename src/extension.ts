import * as vscode from 'vscode';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { findFafFile, readFaf, readFafRaw, scoreFafYaml, generateProjectHtml } from 'faf-cli';

let channel: vscode.OutputChannel | undefined;

/** Phase 0 smoke: locate + score the workspace project.faf, prove the renderer imports pure. */
export function activate(context: vscode.ExtensionContext): { score: number; tier: string } | undefined {
  channel ??= vscode.window.createOutputChannel('FAF — Project Context');

  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) {
    channel.appendLine('FAF: no workspace folder open.');
    return undefined;
  }

  const fafPath = findFafFile(root);
  if (!fafPath) {
    channel.appendLine('FAF: no project.faf found — run `faf init` to author one.');
    return undefined;
  }

  const result = scoreFafYaml(readFafRaw(fafPath));
  channel.appendLine(`FAF: ${fafPath}`);
  channel.appendLine(`FAF: score ${result.score} - tier ${result.tier.name}`);
  console.log('[faf-context] score:', result.score, 'tier:', result.tier.name);

  // Prove generateProjectHtml imports and runs pure (FAF_HEX + string build, no WASM).
  const html = generateProjectHtml(readFaf(fafPath), result, fafPath);
  const outDir = context.globalStorageUri?.fsPath ?? join(tmpdir(), 'faf-context');
  mkdirSync(outDir, { recursive: true });
  const cardPath = join(outDir, 'context-card.html');
  writeFileSync(cardPath, html, 'utf-8');
  channel.appendLine(`FAF: context card rendered -> ${cardPath} (${html.length} bytes)`);

  return { score: result.score, tier: result.tier.name };
}

export function deactivate(): void {
  channel?.dispose();
  channel = undefined;
}
