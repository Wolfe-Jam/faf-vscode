// Phase 1 smoke check — no F5, no Electron.
// Stubs the `vscode` module, loads the BUNDLED dist/extension.js, runs activate()
// against a real project.faf, and asserts the status-bar item reads ✪ FAF 100%.
import { createRequire } from 'node:module';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
// The ws-trophy fixture (a copy of ~/FAF/cli's project.faf) scores 100 / TROPHY
// and is CI-portable. Override with FAF_TARGET to point at any real repo.
const TARGET = process.env.FAF_TARGET ?? join(repoRoot, 'test', 'fixtures', 'ws-trophy');

const lines = [];
const items = [];
const commands = new Map();

const trees = new Map();
const panels = [];

const vscodeStub = {
  StatusBarAlignment: { Left: 1, Right: 2 },
  Disposable: class Disposable {
    constructor(onDispose) {
      this._d = onDispose;
    }
    dispose() {
      this._d?.();
    }
  },
  TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
  ViewColumn: { Active: -1, Beside: -2, One: 1, Two: 2 },
  ThemeColor: class ThemeColor {
    constructor(id) {
      this.id = id;
    }
  },
  ThemeIcon: class ThemeIcon {
    constructor(id, color) {
      this.id = id;
      this.color = color;
    }
  },
  TreeItem: class TreeItem {
    constructor(label, collapsibleState = 0) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  },
  Position: class Position {
    constructor(line, character) {
      this.line = line;
      this.character = character;
    }
  },
  Range: class Range {
    constructor(start, end) {
      this.start = start;
      this.end = end;
    }
  },
  Selection: class Selection {
    constructor(start, end) {
      this.start = start;
      this.end = end;
    }
  },
  RelativePattern: class RelativePattern {
    constructor(base, pattern) {
      this.base = base;
      this.pattern = pattern;
    }
  },
  EventEmitter: class EventEmitter {
    constructor() {
      this._l = new Set();
      this.event = (listener) => {
        this._l.add(listener);
        return { dispose: () => this._l.delete(listener) };
      };
    }
    fire(data) {
      for (const l of [...this._l]) l(data);
    }
    dispose() {
      this._l.clear();
    }
  },
  window: {
    createOutputChannel: (name) => ({
      name,
      appendLine: (l) => lines.push(l),
      append: () => {},
      show: () => {},
      hide: () => {},
      clear: () => {},
      replace: () => {},
      dispose: () => {},
    }),
    createStatusBarItem: (alignment, priority) => {
      const item = {
        alignment,
        priority,
        text: '',
        tooltip: undefined,
        color: undefined,
        command: undefined,
        shown: false,
        show() {
          this.shown = true;
        },
        hide() {
          this.shown = false;
        },
        dispose() {
          this.disposed = true;
        },
      };
      items.push(item);
      return item;
    },
    registerTreeDataProvider: (id, provider) => {
      trees.set(id, provider);
      return { dispose: () => trees.delete(id) };
    },
    createWebviewPanel: (viewType, title, _show, options) => {
      const panel = {
        viewType,
        title,
        options,
        webview: { html: '' },
        reveal() {},
        onDidDispose() {
          return { dispose: () => {} };
        },
        dispose() {
          this.disposed = true;
        },
      };
      panels.push(panel);
      return panel;
    },
    createTerminal: (options) => ({
      name: options.name,
      show() {},
      sendText() {},
      dispose() {},
    }),
    get terminals() {
      return [];
    },
    showTextDocument: () => Promise.resolve({}),
    showInformationMessage: () => Promise.resolve(undefined),
  },
  ProgressLocation: { SourceControl: 1, Window: 10, Notification: 15 },
  commands: {
    registerCommand: (command, callback) => {
      commands.set(command, callback);
      return { dispose: () => commands.delete(command) };
    },
    executeCommand: (command, ...args) => {
      if (command === 'setContext') return Promise.resolve();
      return commands.get(command)?.(...args);
    },
  },
  languages: {
    registerCodeLensProvider: () => ({ dispose: () => {} }),
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: TARGET }, name: 'target', index: 0 }],
    isTrusted: true,
    createFileSystemWatcher: () => ({
      onDidChange: () => ({ dispose: () => {} }),
      onDidCreate: () => ({ dispose: () => {} }),
      onDidDelete: () => ({ dispose: () => {} }),
      dispose() {},
    }),
    openTextDocument: (p) => Promise.resolve({ path: p }),
  },
};

const origLoad = Module._load;
Module._load = function patched(request, parent, isMain) {
  if (request === 'vscode') return vscodeStub;
  return origLoad.call(this, request, parent, isMain);
};

const bundlePath = join(repoRoot, 'dist', 'extension.js');
assert.ok(existsSync(bundlePath), `bundle missing: ${bundlePath} (run npm run build)`);

const require = createRequire(import.meta.url);
const ext = require(bundlePath);

const context = { subscriptions: [], extensionPath: repoRoot };
ext.activate(context);

console.log('--- output channel ---');
for (const l of lines) console.log('  ' + l);
console.log('--- status bar item ---');
console.log('  text:', JSON.stringify(items[0]?.text));
console.log('  tooltip:', JSON.stringify(items[0]?.tooltip));
console.log('  color:', JSON.stringify(items[0]?.color));
console.log('  command:', JSON.stringify(items[0]?.command));
console.log();

assert.equal(items.length, 1, `expected 1 status bar item, got ${items.length}`);
assert.equal(items[0].text, '✪ FAF 100%', `unexpected status bar text: ${items[0].text}`);
assert.equal(items[0].shown, true, 'status bar item was not shown');
assert.equal(items[0].command, 'faf-context.openCard', 'status bar not wired to openCard');
assert.ok(commands.has('faf-context.refresh'), 'refresh command not registered');
assert.ok(commands.has('faf-context.openCard'), 'openCard command not registered');
assert.ok(commands.has('faf-context.sync'), 'sync command not registered');
assert.ok(trees.has('faf-context.hud'), 'HUD tree data provider not registered');
assert.equal(context.subscriptions.length >= 3, true, 'expected >= 3 subscriptions');

// Re-run through the command path.
commands.get('faf-context.refresh')();
assert.equal(items[0].text, '✪ FAF 100%', 'refresh command changed the score');

// The context card renders through the bundled generateProjectHtml.
commands.get('faf-context.openCard')();
assert.equal(panels.length, 1, 'openCard did not create a webview panel');
assert.ok(
  panels[0].webview.html.includes('Content-Security-Policy'),
  'card HTML missing the CSP meta',
);
assert.ok(panels[0].webview.html.includes('TROPHY'), 'card HTML missing the score');

ext.deactivate();
for (const sub of context.subscriptions) sub.dispose?.();

console.log(`PASS  status bar = "${items[0].text}"  subscriptions=${context.subscriptions.length}  (bundled path)`);
