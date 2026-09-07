import { afterEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as mockApi from '../mocks/vscode';
import { findSlotLine, revealSlot } from '../../src/view/reveal';

const FIXTURES = join(import.meta.dir, '..', 'fixtures');
const COLLIDING = readFileSync(join(FIXTURES, 'colliding.faf'), 'utf-8');
const TROPHY = readFileSync(join(FIXTURES, 'trophy.faf'), 'utf-8');

afterEach(() => mockApi.__reset());

/**
 * colliding.faf (0-based):
 *   1  frontend: TOP_LEVEL_STRAY
 *   2  project:
 *   3    name: real-project-name
 *   5    build: STRAY_IN_PROJECT
 *   6  human_context:
 *   7    who: the developers
 *   8    build: STRAY_IN_HUMAN
 *   9  stack:
 *  10    frontend: react
 *  11    # a comment inside the stack block
 *  12    build: vite
 *  13    name: STRAY_IN_STACK
 */
describe('findSlotLine — the colliding fixture', () => {
  test('stack.frontend resolves inside the stack block, not the top-level frontend:', () => {
    expect(findSlotLine(COLLIDING, 'stack.frontend')).toBe(10);
  });

  test('stack.build skips the build: keys under project: and human_context:', () => {
    expect(findSlotLine(COLLIDING, 'stack.build')).toBe(12);
  });

  test('project.name and stack.name do not collide', () => {
    expect(findSlotLine(COLLIDING, 'project.name')).toBe(3);
    expect(findSlotLine(COLLIDING, 'stack.name')).toBe(13);
  });

  test('the strays under each section still resolve to their own block', () => {
    expect(findSlotLine(COLLIDING, 'project.build')).toBe(5);
    expect(findSlotLine(COLLIDING, 'human_context.build')).toBe(8);
    expect(findSlotLine(COLLIDING, 'human_context.who')).toBe(7);
  });

  test('a single bare segment matches the first key of that name', () => {
    expect(findSlotLine(COLLIDING, 'frontend')).toBe(1);
  });

  test('an absent leaf falls back to its section header, not line 0', () => {
    expect(findSlotLine(COLLIDING, 'stack.nonexistent')).toBe(9);
  });

  test('a path that matches nothing returns 0', () => {
    expect(findSlotLine(COLLIDING, 'no_such_section.no_such_key')).toBe(0);
  });
});

describe('findSlotLine — real fixtures', () => {
  test('nested human + stack paths on trophy.faf', () => {
    const lines = TROPHY.split('\n');
    expect(lines[findSlotLine(TROPHY, 'human_context.who')]).toMatch(/^\s*who\s*:/);
    expect(lines[findSlotLine(TROPHY, 'stack.frontend')]).toMatch(/^\s*frontend\s*:/);
    expect(lines[findSlotLine(TROPHY, 'project.name')]).toMatch(/^\s*name\s*:/);
    // the stack.frontend line must be after the `stack:` header
    expect(findSlotLine(TROPHY, 'stack.frontend')).toBeGreaterThan(
      TROPHY.split('\n').findIndex((l) => /^stack:/.test(l)),
    );
  });
});

describe('revealSlot', () => {
  test('opens project.faf and selects the resolved slot line', async () => {
    const fafPath = join(FIXTURES, 'colliding.faf');
    await revealSlot(fafPath, 'stack.build');

    expect(mockApi.__openedDocs).toContain(fafPath);
    const shown = mockApi.__shownDocs[0]!;
    const selection = (shown.options as { selection: { start: { line: number } } })
      .selection;
    expect(selection.start.line).toBe(12);
  });
});
