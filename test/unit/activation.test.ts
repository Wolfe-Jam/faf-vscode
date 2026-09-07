import { afterEach, describe, expect, test } from 'bun:test';
import type { ExtensionContext } from 'vscode';
import * as mockApi from '../mocks/vscode';
import { activate, deactivate } from '../../src/extension';

const CLI_REPO = '/Users/wolfejam/FAF/cli';

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
    mockApi.__setWorkspaceFolders([CLI_REPO]);
    const ctx = makeContext();

    activate(ctx as unknown as ExtensionContext);

    expect(mockApi.__items).toHaveLength(1);
    expect(mockApi.__items[0]!.text).toBe('✪ FAF 100%');
    expect(mockApi.__items[0]!.shown).toBe(true);
    expect(mockApi.__commands.has('faf-context.refresh')).toBe(true);
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
    expect(mockApi.__channels[0]!.lines).toContain('FAF: no workspace folder open.');
  });

  test('the refresh command re-scores without throwing', () => {
    mockApi.__setWorkspaceFolders([CLI_REPO]);
    const ctx = makeContext();
    activate(ctx as unknown as ExtensionContext);

    const refresh = mockApi.__commands.get('faf-context.refresh')!;
    expect(() => refresh()).not.toThrow();
    expect(mockApi.__items[0]!.text).toBe('✪ FAF 100%');
  });
});
