import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TextDocument } from 'vscode';
import { scoreFafYaml } from 'faf-cli';
import { buildViewModel } from '../../src/model';
import { FafCodeLensProvider } from '../../src/view/codelens';
import { REVEAL_SLOT_COMMAND } from '../../src/commands';

const FIXTURES = join(import.meta.dir, '..', 'fixtures');

function lensesFor(name: string) {
  const path = join(FIXTURES, name);
  const raw = readFileSync(path, 'utf-8');
  const provider = new FafCodeLensProvider();
  provider.setModel(buildViewModel(scoreFafYaml(raw), path));
  const doc = { getText: () => raw } as unknown as TextDocument;
  return { raw, path, lenses: provider.provideCodeLenses(doc) };
}

/** 0-based line of a section header in the raw text. */
function headerLine(raw: string, header: RegExp): number {
  return raw.split('\n').findIndex((l) => header.test(l));
}

describe('FafCodeLensProvider — trophy.faf', () => {
  const { raw, lenses } = lensesFor('trophy.faf');

  test('one lens per top-level section, in document order', () => {
    expect(lenses).toHaveLength(3);
    expect(lenses.map((l) => l.range.start.line)).toEqual([
      headerLine(raw, /^project:/),
      headerLine(raw, /^stack:/),
      headerLine(raw, /^human_context:/),
    ]);
  });

  test('titles carry the section fill tallies', () => {
    expect(lenses.map((l) => l.command?.title)).toEqual([
      '● Project — 3/3 · 0 empty',
      '● Stack — 0/0 · 0 empty',
      '● Human Context — 6/6 · 0 empty',
    ]);
  });

  test('a full section has an inert command (no navigation)', () => {
    expect(lenses.every((l) => l.command?.command === '')).toBe(true);
  });
});

describe('FafCodeLensProvider — partial.faf', () => {
  const { path, lenses } = lensesFor('partial.faf');

  test('the Human Context section shows the gap and points at the first empty slot', () => {
    const human = lenses.find((l) => l.command?.title?.includes('Human Context'));
    expect(human?.command?.title).toBe('○ Human Context — 4/6 · 2 empty');
    expect(human?.command?.command).toBe(REVEAL_SLOT_COMMAND);
    expect(human?.command?.arguments).toEqual([path, 'human_context.when']);
  });

  test('the Project section is full — inert', () => {
    const project = lenses.find((l) => l.command?.title?.includes('Project'));
    expect(project?.command?.title).toBe('● Project — 3/3 · 0 empty');
    expect(project?.command?.command).toBe('');
  });
});

describe('FafCodeLensProvider — no model', () => {
  test('yields nothing until setModel gets a view model', () => {
    const provider = new FafCodeLensProvider();
    const doc = { getText: () => 'project:\n  name: x\n' } as unknown as TextDocument;
    expect(provider.provideCodeLenses(doc)).toEqual([]);

    provider.setModel({ kind: 'no-faf' });
    expect(provider.provideCodeLenses(doc)).toEqual([]);
  });
});
