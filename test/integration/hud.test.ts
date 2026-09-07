import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import type { FafExtensionApi } from '../../src/extension';

// Tier 2 (Engine) — runs inside a real VS Code extension host with
// test/fixtures/ws-trophy as the workspace folder (see .vscode-test.mjs).
// CI-only: needs a VS Code download + a display. Not run headless.

suite('FAF HUD — extension host', () => {
  let api: FafExtensionApi;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension<FafExtensionApi>('faf.faf-context');
    assert.ok(ext, 'extension faf.faf-context is not installed in the host');
    api = await ext.activate();
  });

  test('scores the fixture workspace at 100 / TROPHY in the status bar', () => {
    assert.equal(api.statusBarText(), '✪ FAF 100%');
    const outcome = api.outcome();
    assert.ok(!('kind' in outcome));
  });

  test('registers the HUD tree and its commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('faf-context.openCard'));
    assert.ok(commands.includes('faf-context.sync'));

    // The tree renders a header row for the fixture.
    const header = api.hud.getChildren()[0];
    assert.ok(header);
    const item = api.hud.getTreeItem(header);
    assert.match(String(item.label), /100%\s+TROPHY/);
  });
});
