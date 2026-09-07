import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as mockApi from '../mocks/vscode';
import { disposeFafOutput } from '../../src/channel';
import { ensureTrusted, resolveFafCli, runBundledFaf } from '../../src/faf/run';

afterEach(() => {
  disposeFafOutput();
  mockApi.__reset();
});

describe('resolveFafCli', () => {
  test('prefers <extensionPath>/node_modules/faf-cli/dist/cli.js when present', () => {
    const ext = mkdtempSync(join(tmpdir(), 'faf-vscode-ext-'));
    try {
      const dist = join(ext, 'node_modules', 'faf-cli', 'dist');
      mkdirSync(dist, { recursive: true });
      const cli = join(dist, 'cli.js');
      writeFileSync(cli, '// fake cli\n');
      expect(resolveFafCli(ext)).toBe(cli);
    } finally {
      rmSync(ext, { recursive: true, force: true });
    }
  });

  test('falls back to the resolved faf-cli package (the bun-link symlink)', () => {
    const resolved = resolveFafCli(join(tmpdir(), 'no-such-extension-dir'));
    expect(resolved.endsWith(join('dist', 'cli.js'))).toBe(true);
    expect(existsSync(resolved)).toBe(true);
  });

  test('never silently returns a path that does not exist', () => {
    // both branches guard on existsSync; the resolved path is always real
    expect(existsSync(resolveFafCli('/definitely/not/here'))).toBe(true);
  });
});

describe('runBundledFaf', () => {
  test('spawns VS Code\'s own runtime against the bundled cli.js — no PATH', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'faf-vscode-run-'));
    try {
      const res = await runBundledFaf(
        join(tmpdir(), 'no-such-extension-dir'),
        ['--version'],
        { cwd, title: 'Checking the FAF CLI…' },
      );
      expect(res.code).toBe(0);
      expect(res.output).toMatch(/\d+\.\d+\.\d+/);

      // the command + argv are logged to the shared output channel
      const logged = mockApi.__channels.flatMap((c) => c.lines).join('\n');
      expect(logged).toContain('$ faf --version');
      expect(logged).toContain(process.execPath);

      // the progress spinner carried the caller's title
      expect(mockApi.__progressTitles).toContain('Checking the FAF CLI…');
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  test('a non-zero exit is reported, not thrown', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'faf-vscode-run-'));
    try {
      const res = await runBundledFaf(
        join(tmpdir(), 'no-such-extension-dir'),
        ['this-is-not-a-command'],
        { cwd, title: 'x' },
      );
      expect(res.code).not.toBe(0);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

describe('ensureTrusted', () => {
  test('returns false and warns in an untrusted workspace', () => {
    mockApi.__setTrusted(false);
    expect(ensureTrusted()).toBe(false);
    expect(mockApi.__warnMessages[0]).toBe(
      'Trust this workspace to run FAF Sync/Init.',
    );
  });

  test('returns true when the workspace is trusted', () => {
    mockApi.__setTrusted(true);
    expect(ensureTrusted()).toBe(true);
    expect(mockApi.__warnMessages).toHaveLength(0);
  });
});
