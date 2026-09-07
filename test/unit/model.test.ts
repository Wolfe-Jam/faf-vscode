import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scoreFafYaml } from 'faf-cli';
import {
  buildViewModel,
  driftLabel,
  formatStatusBar,
  tierGlyph,
  tierHex,
  type FafViewModel,
} from '../../src/model';
import type { DriftTarget } from 'faf-cli';

const FIXTURES = join(import.meta.dir, '..', 'fixtures');

function vmFor(name: string): FafViewModel {
  const path = join(FIXTURES, name);
  return buildViewModel(scoreFafYaml(readFileSync(path, 'utf-8')), path);
}

describe('buildViewModel — trophy.faf', () => {
  const vm = vmFor('trophy.faf');

  test('score, tier name, glyph, hex', () => {
    expect(vm.score).toBe(100);
    expect(vm.tierName).toBe('TROPHY');
    expect(vm.tierGlyph).toBe('✪');
    expect(vm.tierHex).toBe('#FF6B35');
  });

  test('no next tier at the top', () => {
    expect(vm.nextTier).toBeNull();
  });

  test('counts come straight off the ScoreResult', () => {
    expect(vm.counts).toEqual({
      populated: 9,
      empty: 0,
      ignored: 12,
      active: 9,
      total: 21,
    });
  });

  test('slots flatten and group by category', () => {
    expect(vm.slots).toHaveLength(21);
    expect(vm.grouped.project).toHaveLength(3);
    expect(vm.grouped.human).toHaveLength(6);
    // stack.* slots are ignored but still present, grouped under their categories
    const groupedTotal = Object.values(vm.grouped).reduce((n, g) => n + g.length, 0);
    expect(groupedTotal).toBe(21);
  });

  test('spot-checked slot label + state', () => {
    const who = vm.slots.find((s) => s.path === 'human_context.who');
    expect(who?.label).toBe('Who');
    expect(who?.state).toBe('populated');
    expect(who?.category).toBe('human');

    const frontend = vm.slots.find((s) => s.path === 'stack.frontend');
    expect(frontend?.label).toBe('Framework');
    expect(frontend?.state).toBe('slotignored');
  });

  test('sourcePath + inherited', () => {
    expect(vm.sourcePath.endsWith('trophy.faf')).toBe(true);
    expect(vm.inherited).toBe(false);
  });
});

describe('buildViewModel — bronze.faf', () => {
  const vm = vmFor('bronze.faf');

  test('92 / BRONZE / gap 3 to SILVER', () => {
    expect(vm.score).toBe(92);
    expect(vm.tierName).toBe('BRONZE');
    expect(vm.tierGlyph).toBe('◇');
    expect(vm.tierHex).toBe('#0E8C8C');
    expect(vm.nextTier).toEqual({ name: 'SILVER', gap: 3 });
  });

  test('carries exactly one empty slot', () => {
    expect(vm.counts.empty).toBe(1);
    expect(vm.slots.filter((s) => s.state === 'empty')).toHaveLength(1);
  });
});

describe('buildViewModel — partial.faf', () => {
  const vm = vmFor('partial.faf');

  test('GREEN, gap to BRONZE', () => {
    expect(vm.tierName).toBe('GREEN');
    expect(vm.score).toBe(78);
    expect(vm.tierGlyph).toBe('●');
    expect(vm.nextTier).toEqual({ name: 'BRONZE', gap: 7 });
  });

  test('GREEN has no brand hex — rides the theme', () => {
    expect(vm.tierHex).toBeNull();
  });

  test('two empty human slots', () => {
    const empties = vm.slots.filter((s) => s.state === 'empty');
    expect(empties.map((s) => s.path).sort()).toEqual([
      'human_context.how',
      'human_context.when',
    ]);
  });
});

describe('formatStatusBar', () => {
  test('trophy — text + tooltip', () => {
    const { text, tooltip } = formatStatusBar(vmFor('trophy.faf'));
    expect(text).toBe('✪ FAF 100%');
    expect(tooltip).toContain('TROPHY');
    expect(tooltip).toContain('9/9 slots populated');
    expect(tooltip).not.toContain(' to '); // no next-tier line at the top
  });

  test('bronze — tooltip names the gap and the next tier', () => {
    const { text, tooltip } = formatStatusBar(vmFor('bronze.faf'));
    expect(text).toBe('◇ FAF 92%');
    expect(tooltip).toContain('3 to SILVER');
    expect(tooltip).toContain('11/12 slots populated');
  });
});

describe('driftLabel', () => {
  const t = (status: DriftTarget['status'], delta_ms: number | null): DriftTarget => ({
    file: 'CLAUDE.md',
    exists: status !== 'missing',
    mtime_ms: delta_ms == null ? null : 1_000_000 + delta_ms,
    status,
    delta_ms,
  });

  test('newer reads "… newer", never "… ago"', () => {
    expect(driftLabel(t('newer', 3 * 60 * 60 * 1000))).toBe('needs sync · 3h newer');
    expect(driftLabel(t('newer', 2 * 24 * 60 * 60 * 1000))).toBe('needs sync · 2d newer');
    expect(driftLabel(t('newer', 5 * 60 * 1000))).toBe('needs sync · 5m newer');
    expect(driftLabel(t('newer', 3 * 60 * 60 * 1000))).not.toContain('ago');
  });

  test('newer under a minute drops the span — no "just now newer"', () => {
    expect(driftLabel(t('newer', 4000))).toBe('needs sync');
    expect(driftLabel(t('newer', null))).toBe('needs sync');
  });

  test('older still reads "older · Xd ago"', () => {
    expect(driftLabel(t('older', -2 * 24 * 60 * 60 * 1000))).toBe('older · 2d ago');
    expect(driftLabel(t('older', -45 * 60 * 1000))).toBe('older · 45m ago');
  });

  test('in-sync / missing are unchanged', () => {
    expect(driftLabel(t('in-sync', 200))).toBe('in sync');
    expect(driftLabel(t('missing', null))).toBe('missing');
  });
});

describe('tier helpers', () => {
  test('glyph map — the full ladder, no emoji', () => {
    expect(tierGlyph('TROPHY')).toBe('✪');
    expect(tierGlyph('GOLD')).toBe('★');
    expect(tierGlyph('SILVER')).toBe('◆');
    expect(tierGlyph('BRONZE')).toBe('◇');
    expect(tierGlyph('GREEN')).toBe('●');
    expect(tierGlyph('YELLOW')).toBe('●');
    expect(tierGlyph('RED')).toBe('○');
    expect(tierGlyph('WHITE')).toBe('♡');
    expect(tierGlyph('WAT')).toBe('●'); // unknown -> safe default
  });

  test('hex — only the top four tiers carry brand colour', () => {
    expect(tierHex('TROPHY')).toBe('#FF6B35');
    expect(tierHex('GOLD')).toBe('#FF6B35');
    expect(tierHex('SILVER')).toBe('#00D4D4');
    expect(tierHex('BRONZE')).toBe('#0E8C8C');
    expect(tierHex('GREEN')).toBeNull();
    expect(tierHex('YELLOW')).toBeNull();
    expect(tierHex('RED')).toBeNull();
    expect(tierHex('WHITE')).toBeNull();
  });
});
