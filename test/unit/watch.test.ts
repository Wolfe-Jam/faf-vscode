import { afterEach, describe, expect, jest, test } from 'bun:test';
import * as mockApi from '../mocks/vscode';
import { createWatcher, WATCH_GLOB } from '../../src/watch';

afterEach(() => {
  jest.useRealTimers();
  mockApi.__reset();
});

describe('createWatcher', () => {
  test('watches project.faf + the four sync targets in the workspace root', () => {
    createWatcher('/ws', () => {});
    const watcher = mockApi.__watchers[0]!;
    expect(watcher.pattern.base).toBe('/ws');
    expect(watcher.pattern.pattern).toBe(WATCH_GLOB);
    expect(WATCH_GLOB).toContain('project.faf');
    expect(WATCH_GLOB).toContain('CLAUDE.md');
    expect(WATCH_GLOB).toContain('GEMINI.md');
  });

  test('5 rapid events -> exactly one debounced refresh', () => {
    jest.useFakeTimers();
    let refreshes = 0;
    createWatcher('/ws', () => refreshes++);
    const watcher = mockApi.__watchers[0]!;

    for (let i = 0; i < 5; i++) {
      watcher.emitChange();
    }
    expect(refreshes).toBe(0); // still inside the debounce window

    jest.advanceTimersByTime(150);
    expect(refreshes).toBe(1);

    jest.advanceTimersByTime(1000);
    expect(refreshes).toBe(1); // no trailing extra fire
  });

  test('create + delete also feed the same debounce', () => {
    jest.useFakeTimers();
    let refreshes = 0;
    createWatcher('/ws', () => refreshes++);
    const watcher = mockApi.__watchers[0]!;

    watcher.handlers.create.forEach((cb) => cb());
    watcher.handlers.delete.forEach((cb) => cb());
    jest.advanceTimersByTime(150);
    expect(refreshes).toBe(1);
  });

  test('reports fafChanged: true only when project.faf was the file touched', () => {
    jest.useFakeTimers();
    const seen: boolean[] = [];
    createWatcher('/ws', (fafChanged) => seen.push(fafChanged));
    const watcher = mockApi.__watchers[0]!;

    watcher.emitChange('/ws/CLAUDE.md');
    jest.advanceTimersByTime(150);
    watcher.emitChange('/ws/project.faf');
    jest.advanceTimersByTime(150);
    watcher.emitChange(); // no path (delete event etc.) -> assume the .faf moved
    jest.advanceTimersByTime(150);

    expect(seen).toEqual([false, true, true]);
  });

  test('a project.faf touch in the same debounce window wins over a CLAUDE.md touch', () => {
    jest.useFakeTimers();
    const seen: boolean[] = [];
    createWatcher('/ws', (fafChanged) => seen.push(fafChanged));
    const watcher = mockApi.__watchers[0]!;

    watcher.emitChange('/ws/CLAUDE.md');
    watcher.emitChange('/ws/project.faf');
    watcher.emitChange('/ws/AGENTS.md');
    jest.advanceTimersByTime(150);

    expect(seen).toEqual([true]);
  });

  test('dispose() tears down the watcher and cancels a pending fire', () => {
    jest.useFakeTimers();
    let refreshes = 0;
    const sub = createWatcher('/ws', () => refreshes++);
    const watcher = mockApi.__watchers[0]!;

    watcher.emitChange();
    sub.dispose();
    jest.advanceTimersByTime(1000);

    expect(refreshes).toBe(0);
    expect(watcher.disposed).toBe(true);
  });
});
