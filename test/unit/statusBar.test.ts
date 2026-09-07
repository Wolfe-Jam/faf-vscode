import { afterEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scoreFafYaml } from 'faf-cli';
import * as mockApi from '../mocks/vscode';
import { buildViewModel, type FafViewModel } from '../../src/model';
import { StatusBarController } from '../../src/view/statusBar';

const FIXTURES = join(import.meta.dir, '..', 'fixtures');

function vmFor(name: string): FafViewModel {
  const path = join(FIXTURES, name);
  return buildViewModel(scoreFafYaml(readFileSync(path, 'utf-8')), path);
}

afterEach(() => {
  mockApi.__reset();
});

describe('StatusBarController', () => {
  test('creates one Right-aligned item wired to the open-card command', () => {
    new StatusBarController();
    const item = mockApi.__items[0]!;
    expect(mockApi.__items).toHaveLength(1);
    expect(item.alignment).toBe(mockApi.StatusBarAlignment.Right);
    expect(item.priority).toBe(100);
    expect(item.command).toBe('faf-context.openCard');
  });

  test('render(trophy) -> "✪ FAF 100%", brand hex, shown', () => {
    const controller = new StatusBarController();
    controller.render(vmFor('trophy.faf'));
    const item = mockApi.__items[0]!;
    expect(item.text).toBe('✪ FAF 100%');
    expect(item.tooltip).toContain('TROPHY');
    expect(item.color).toBe('#FF6B35');
    expect(item.shown).toBe(true);
  });

  test('render(bronze) -> "◇ FAF 92%", tooltip names the gap to SILVER', () => {
    const controller = new StatusBarController();
    controller.render(vmFor('bronze.faf'));
    const item = mockApi.__items[0]!;
    expect(item.text).toBe('◇ FAF 92%');
    expect(item.tooltip).toContain('3 to SILVER');
    expect(item.color).toBe('#0E8C8C');
    expect(item.shown).toBe(true);
  });

  test('render(GREEN) clears the brand colour', () => {
    const controller = new StatusBarController();
    controller.render(vmFor('partial.faf'));
    const item = mockApi.__items[0]!;
    expect(item.text).toBe('● FAF 78%');
    expect(item.color).toBeUndefined();
  });

  test('render(no-faf) / render(no-workspace) hide the item', () => {
    const controller = new StatusBarController();
    controller.render(vmFor('trophy.faf'));
    expect(mockApi.__items[0]!.shown).toBe(true);

    controller.render({ kind: 'no-faf' });
    expect(mockApi.__items[0]!.shown).toBe(false);

    controller.render({ kind: 'no-workspace' });
    expect(mockApi.__items[0]!.shown).toBe(false);
  });

  test('dispose() disposes the item', () => {
    const controller = new StatusBarController();
    controller.dispose();
    expect(mockApi.__items[0]!.disposed).toBe(true);
  });
});
