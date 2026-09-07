import { afterEach, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import type { ExtensionContext } from 'vscode';
import * as mockApi from '../mocks/vscode';
import { activate, deactivate } from '../../src/extension';

// A dir fixture with a `project.faf` (copied from ~/FAF/cli, scores 100 / TROPHY)
// — `findFafFile` returns it directly, so this is CI-portable.
const WS_TROPHY = join(import.meta.dir, '..', 'fixtures', 'ws-trophy');

interface TestContext {
  subscriptions: Array<{ dispose(): void }>;
}

function makeContext(): TestContext {
  return { subscriptions: [] };
}

afterEach(() => {
  deactivate();
  mockApi.__reset();
});

describe('activate', () => {
  test('FAF workspace -> status bar populated, every subscription disposable', () => {
    mockApi.__setWorkspaceFolders([WS_TROPHY]);
    const ctx = makeContext();

    activate(ctx as unknown as ExtensionContext);

    expect(mockApi.__items).toHaveLength(1);
    expect(mockApi.__items[0]!.text).toBe('✪ FAF 100%');
    expect(mockApi.__items[0]!.shown).toBe(true);
    for (const id of [
      'faf-context.refresh',
      'faf-context.openCard',
      'faf-context.openFaf',
      'faf-context.sync',
      'faf-context.init',
      'faf-context.showDna',
      'faf-context.revealSlot',
    ]) {
      expect(mockApi.__commands.has(id)).toBe(true);
    }
    // CodeLens provider registered for project.faf; hasFaf context key set
    expect(mockApi.__codeLensProviders).toHaveLength(1);
    expect(mockApi.__contextKeys.get('faf-context.hasFaf')).toBe(true);
    expect(mockApi.__channels[0]!.lines.some((l) => l.includes('100% TROPHY'))).toBe(true);

    expect(ctx.subscriptions.length).toBeGreaterThanOrEqual(3);
    for (const sub of ctx.subscriptions) {
      expect(typeof sub.dispose).toBe('function');
      sub.dispose();
    }
    expect(mockApi.__items[0]!.disposed).toBe(true);
    expect(mockApi.__channels[0]!.disposed).toBe(true);
  });

  test('no workspace -> no throw, item created but not shown', () => {
    mockApi.__setWorkspaceFolders(undefined);
    const ctx = makeContext();

    expect(() => activate(ctx as unknown as ExtensionContext)).not.toThrow();
    expect(mockApi.__items[0]?.shown ?? false).toBe(false);
    expect(mockApi.__contextKeys.get('faf-context.hasFaf')).toBe(false);
    expect(mockApi.__channels[0]!.lines).toContain('FAF: no workspace folder open.');
  });

  test('the refresh command re-scores without throwing', () => {
    mockApi.__setWorkspaceFolders([WS_TROPHY]);
    const ctx = makeContext();
    activate(ctx as unknown as ExtensionContext);

    const refresh = mockApi.__commands.get('faf-context.refresh')!;
    expect(() => refresh()).not.toThrow();
    expect(mockApi.__items[0]!.text).toBe('✪ FAF 100%');
  });
});
