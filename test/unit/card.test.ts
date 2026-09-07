import { afterEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateProjectHtml, readFaf, scoreFafYaml } from 'faf-cli';
import * as mockApi from '../mocks/vscode';
import { buildViewModel } from '../../src/model';
import { injectCsp, showCard, __disposeCard } from '../../src/view/card';

const WS_FAF = join(import.meta.dir, '..', 'fixtures', 'ws-trophy', 'project.faf');

function cardHtml(): string {
  return generateProjectHtml(
    readFaf(WS_FAF),
    scoreFafYaml(readFileSync(WS_FAF, 'utf-8')),
    WS_FAF,
  );
}

afterEach(() => {
  __disposeCard();
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

  test('a strict CSP meta lands as the first child of <head>', () => {
    expect(out).toContain(
      `<head>\n<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;">`,
    );
  });

  test('the score survives the injection', () => {
    expect(out).toContain('✪ TROPHY');
    expect(out).toContain('100%');
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
