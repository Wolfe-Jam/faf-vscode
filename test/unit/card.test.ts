import { afterEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateProjectHtml, readFaf, scoreFafYaml } from 'faf-cli';
import type { ScoreResult } from 'faf-cli';
import * as mockApi from '../mocks/vscode';
import { buildViewModel } from '../../src/model';
import { renderProjectHtml } from '../../src/engine';
import { injectCsp, showCard, disposeCard } from '../../src/view/card';

const WS_FAF = join(import.meta.dir, '..', 'fixtures', 'ws-trophy', 'project.faf');

function cardHtml(): string {
  return generateProjectHtml(
    readFaf(WS_FAF),
    scoreFafYaml(readFileSync(WS_FAF, 'utf-8')),
    WS_FAF,
  );
}

afterEach(() => {
  disposeCard();
  mockApi.__reset();
});

describe('injectCsp', () => {
  const raw = cardHtml();
  const out = injectCsp(raw);

  test('the source card is static — no script, no external resource', () => {
    expect(raw).not.toContain('<script');
    expect(raw).not.toMatch(/(?:src|href)\s*=\s*["']https?:/i);
    expect(raw).not.toContain('<link');
  });

  test("faf-cli's renderer emits a <head> we can inject into", () => {
    expect(raw).toMatch(/<head[^>]*>/i);
    expect(() => injectCsp(raw)).not.toThrow();
  });

  test('a strict CSP meta lands as the first child of <head>', () => {
    expect(out).toContain(
      `<head>\n<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;">`,
    );
  });

  test('injects after a <head> that carries attributes', () => {
    const withAttrs = injectCsp('<html><head lang="en"><title>x</title></head></html>');
    expect(withAttrs).toContain(
      `<head lang="en">\n<meta http-equiv="Content-Security-Policy"`,
    );
  });

  test('throws (not a silently unprotected webview) when there is no <head>', () => {
    expect(() => injectCsp('<html><body>hi</body></html>')).toThrow(/no <head>/);
  });

  test('the score survives the injection', () => {
    expect(out).toContain('✪ TROPHY');
    expect(out).toContain('100%');
  });
});

describe('renderProjectHtml — threaded score (no re-score)', () => {
  test('renders from the ScoreResult it is handed, not a fresh one', () => {
    const real = scoreFafYaml(readFileSync(WS_FAF, 'utf-8'));
    const faked: ScoreResult = {
      ...real,
      score: 42,
      tier: { ...real.tier, name: 'YELLOW' },
    };
    const html = renderProjectHtml(WS_FAF, faked);
    expect(html).toContain('42');
    expect(html).toContain('YELLOW');
    expect(html).not.toContain('✪ TROPHY');
  });

  test('with no score arg it falls back to scoring the file', () => {
    const html = renderProjectHtml(WS_FAF);
    expect(html).toContain('✪ TROPHY');
  });
});

describe('showCard', () => {
  test('opens one webview beside the editor, scripts disabled, reused on re-open', () => {
    const vm = buildViewModel(
      scoreFafYaml(readFileSync(WS_FAF, 'utf-8')),
      WS_FAF,
      { projectName: 'faf-cli' },
    );

    showCard(vm, WS_FAF);
    expect(mockApi.__panels).toHaveLength(1);
    const panel = mockApi.__panels[0]!;
    expect(panel.title).toBe('FAF — faf-cli');
    expect((panel.options as { enableScripts: boolean }).enableScripts).toBe(false);
    expect(panel.webview.html).toContain('Content-Security-Policy');

    showCard(vm, WS_FAF);
    expect(mockApi.__panels).toHaveLength(1); // reused, not a second panel
    expect(panel.revealed).toBe(1);
  });
});
