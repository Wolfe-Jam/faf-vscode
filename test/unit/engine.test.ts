import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderProjectHtml, scoreWorkspace } from '../../src/engine';
import { isViewModel } from '../../src/model';

// A dir fixture — `findFafFile` returns `<dir>/project.faf` directly (it checks
// the given dir before walking one level up), so this never reaches the repo's
// own project.faf. Copied from ~/FAF/cli, scores 100 / TROPHY.
const WS_TROPHY = join(import.meta.dir, '..', 'fixtures', 'ws-trophy');
const WS_FAF = join(WS_TROPHY, 'project.faf');

// Local CLI, still used for ONE cross-check that faf-cli's library score and
// its `score --json` command agree — but pointed at the fixture, not a path
// hardcoded to this machine's checkout.
const CLI_JS = '/Users/wolfejam/FAF/cli/dist/cli.js';

describe('scoreWorkspace', () => {
  test('scores the ws-trophy fixture at 100 / TROPHY', () => {
    const outcome = scoreWorkspace(WS_TROPHY);
    expect(isViewModel(outcome)).toBe(true);
    if (!isViewModel(outcome)) return;

    expect(outcome.score).toBe(100);
    expect(outcome.tierName).toBe('TROPHY');
    expect(outcome.tierGlyph).toBe('✪');
    expect(outcome.projectName).toBe('faf-cli');
    expect(outcome.hudGroups.map((g) => g.label)).toEqual([
      'Project',
      'Human Context',
      'Stack',
    ]);
  });

  test('carries a drift report (targets missing beside the bare fixture)', () => {
    const outcome = scoreWorkspace(WS_TROPHY);
    if (!isViewModel(outcome)) throw new Error('expected a view model');
    expect(outcome.drift).toBeDefined();
    expect(outcome.drift?.targets.map((t) => t.file)).toEqual([
      'CLAUDE.md',
      'AGENTS.md',
      '.cursorrules',
      'GEMINI.md',
    ]);
    expect(outcome.drift?.missing).toBe(4);
  });

  test('library score === `faf score --json` score (guards faf-cli drift)', () => {
    if (!existsSync(CLI_JS)) return; // cross-check only where the local CLI is built
    const outcome = scoreWorkspace(WS_TROPHY);
    if (!isViewModel(outcome)) throw new Error('expected a view model');

    const cli = JSON.parse(
      execFileSync('node', [CLI_JS, 'score', '--json', WS_FAF], { encoding: 'utf-8' }),
    ) as { score: number; tier: { name: string }; active: number; total: number; populated: number };

    expect(outcome.score).toBe(cli.score);
    expect(outcome.tierName).toBe(cli.tier.name);
    expect(outcome.counts.active).toBe(cli.active);
    expect(outcome.counts.total).toBe(cli.total);
    expect(outcome.counts.populated).toBe(cli.populated);
  });

  test('undefined root -> no-workspace', () => {
    expect(scoreWorkspace(undefined)).toEqual({ kind: 'no-workspace' });
  });

  test('directory with no project.faf -> no-faf', () => {
    const dir = mkdtempSync(join(tmpdir(), 'faf-vscode-nofaf-'));
    try {
      expect(scoreWorkspace(dir)).toEqual({ kind: 'no-faf' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('renderProjectHtml', () => {
  test('returns faf-cli`s self-contained card HTML for the fixture', () => {
    const html = renderProjectHtml(WS_FAF);
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<title>faf-cli — project.faf</title>');
    expect(html).toContain('✪ TROPHY');
    expect(html).not.toContain('<script');
  });
});
