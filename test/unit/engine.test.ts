import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scoreWorkspace } from '../../src/engine';
import { isViewModel } from '../../src/model';

const CLI_REPO = '/Users/wolfejam/FAF/cli';
const CLI_JS = join(CLI_REPO, 'dist', 'cli.js');
const CLI_FAF = join(CLI_REPO, 'project.faf');

describe('scoreWorkspace', () => {
  test('scores ~/FAF/cli at 100 AND matches `faf score --json` (guards faf-cli drift)', () => {
    const outcome = scoreWorkspace(CLI_REPO);
    expect(isViewModel(outcome)).toBe(true);
    if (!isViewModel(outcome)) return;

    expect(outcome.score).toBe(100);
    expect(outcome.tierName).toBe('TROPHY');

    const cli = JSON.parse(
      execFileSync('node', [CLI_JS, 'score', '--json', CLI_FAF], { encoding: 'utf-8' }),
    ) as {
      score: number;
      tier: { name: string };
      active: number;
      total: number;
      populated: number;
    };

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
