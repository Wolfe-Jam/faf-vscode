import { afterEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scoreFafYaml } from 'faf-cli';
import type { DriftReport } from 'faf-cli';
import * as mockApi from '../mocks/vscode';
import { buildViewModel, type FafViewModel } from '../../src/model';
import { HudTreeProvider } from '../../src/view/sidebar';

const FIXTURES = join(import.meta.dir, '..', 'fixtures');

const SYNTHETIC_DRIFT: DriftReport = {
  source: '/ws/project.faf',
  source_mtime_ms: 1_000_000,
  targets: [
    { file: 'CLAUDE.md', exists: true, mtime_ms: 1_500_000, status: 'newer', delta_ms: 500_000 },
    { file: 'AGENTS.md', exists: true, mtime_ms: 900_000, status: 'older', delta_ms: -100_000 },
    { file: '.cursorrules', exists: true, mtime_ms: 1_000_200, status: 'in-sync', delta_ms: 200 },
    { file: 'GEMINI.md', exists: false, mtime_ms: null, status: 'missing', delta_ms: null },
  ],
  drifted: 2,
  in_sync: 1,
  missing: 1,
};

function vmFor(name: string, drift?: DriftReport): FafViewModel {
  const path = join(FIXTURES, name);
  return buildViewModel(scoreFafYaml(readFileSync(path, 'utf-8')), path, {
    drift,
    projectName: 'fixture',
  });
}

afterEach(() => mockApi.__reset());

describe('HudTreeProvider — trophy vm', () => {
  const provider = new HudTreeProvider();
  provider.refresh(vmFor('trophy.faf'));
  const roots = provider.getChildren();

  test('roots: header + 3 slot groups (no drift node without a report)', () => {
    expect(roots.map((n) => (n as { kind: string }).kind)).toEqual([
      'header',
      'group',
      'group',
      'group',
    ]);
  });

  test('header row text + description', () => {
    const item = provider.getTreeItem(roots[0]!);
    expect(item.label).toBe('✪ 100%  TROPHY');
    expect(item.description).toBe('Trophy');
  });

  test('the 3 groups are Project / Human Context / Stack with the right counts', () => {
    const groups = roots.slice(1).map((n) => provider.getTreeItem(n));
    expect(groups.map((g) => g.label)).toEqual(['Project', 'Human Context', 'Stack']);
    const children = roots.slice(1).map((n) => provider.getChildren(n));
    expect(children.map((c) => c.length)).toEqual([3, 6, 12]);
  });

  test('slot rows carry state via icon + description; ignored stack slots read slotignored', () => {
    const stackGroup = roots[3]!;
    const rows = provider.getChildren(stackGroup).map((n) => provider.getTreeItem(n));
    expect(rows.every((r) => r.description === 'slotignored')).toBe(true);
    const icon = rows[0]!.iconPath as mockApi.ThemeIcon;
    expect(icon.id).toBe('dash');
    // trophy has no empty slots -> no navigation command anywhere
    expect(rows.some((r) => r.command !== undefined)).toBe(false);
  });
});

describe('HudTreeProvider — bronze vm', () => {
  const provider = new HudTreeProvider();
  provider.refresh(vmFor('bronze.faf'));
  const roots = provider.getChildren();

  test('the one empty slot row carries a reveal command', () => {
    const slots = roots
      .slice(1)
      .flatMap((g) => provider.getChildren(g))
      .map((n) => provider.getTreeItem(n));
    const empty = slots.filter((s) => s.description === 'empty');
    expect(empty).toHaveLength(1);
    expect(empty[0]!.command?.command).toBe('faf-context.revealSlot');
    expect(empty[0]!.command?.arguments?.[1]).toMatch(/\./); // a dot-path
    const icon = empty[0]!.iconPath as mockApi.ThemeIcon;
    expect(icon.id).toBe('circle-outline');
  });
});

describe('HudTreeProvider — drift group', () => {
  const provider = new HudTreeProvider();
  provider.refresh(vmFor('trophy.faf', SYNTHETIC_DRIFT));
  const roots = provider.getChildren();

  test('a drift root node appears when the vm has a report', () => {
    const kinds = roots.map((n) => (n as { kind: string }).kind);
    expect(kinds[kinds.length - 1]).toBe('drift-root');
    const driftRoot = roots[roots.length - 1]!;
    expect(provider.getTreeItem(driftRoot).description).toBe('2 to sync');
    expect(provider.getTreeItem(driftRoot).contextValue).toBe('faf.drift');
  });

  test('4 target rows, one per file, with the right status text', () => {
    const driftRoot = roots[roots.length - 1]!;
    const rows = provider.getChildren(driftRoot).map((n) => provider.getTreeItem(n));
    expect(rows.map((r) => r.label)).toEqual([
      'CLAUDE.md',
      'AGENTS.md',
      '.cursorrules',
      'GEMINI.md',
    ]);
    expect(rows[0]!.description).toMatch(/^needs sync · /);
    expect(rows[0]!.contextValue).toBe('faf.drift.newer');
    expect(rows[1]!.description).toMatch(/^older · /);
    expect(rows[2]!.description).toBe('in sync');
    expect(rows[3]!.description).toBe('missing');
    expect((rows[0]!.iconPath as mockApi.ThemeIcon).id).toBe('warning');
  });
});

describe('HudTreeProvider — no faf', () => {
  test('renders a single guidance row', () => {
    const provider = new HudTreeProvider();
    provider.refresh({ kind: 'no-faf' });
    const roots = provider.getChildren();
    expect(roots).toHaveLength(1);
    expect(provider.getTreeItem(roots[0]!).label).toContain('No project.faf');
  });
});
