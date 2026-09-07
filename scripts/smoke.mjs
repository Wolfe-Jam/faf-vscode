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
const TARGET = process.env.FAF_TARGET ?? '/Users/wolfejam/FAF/cli';

const lines = [];
const items = [];
const commands = new Map();

const vscodeStub = {
  StatusBarAlignment: { Left: 1, Right: 2 },
  ThemeColor: class ThemeColor {
    constructor(id) {
      this.id = id;
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
  },
  commands: {
    registerCommand: (command, callback) => {
      commands.set(command, callback);
      return { dispose: () => commands.delete(command) };
    },
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: TARGET }, name: 'target', index: 0 }],
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
assert.equal(items[0].command, 'faf-context.refresh', 'refresh command not wired');
assert.ok(commands.has('faf-context.refresh'), 'refresh command not registered');
assert.equal(context.subscriptions.length >= 3, true, 'expected >= 3 subscriptions');

// Re-run through the command path.
commands.get('faf-context.refresh')();
assert.equal(items[0].text, '✪ FAF 100%', 'refresh command changed the score');

ext.deactivate();
for (const sub of context.subscriptions) sub.dispose?.();

console.log(`PASS  status bar = "${items[0].text}"  subscriptions=${context.subscriptions.length}  (bundled path)`);
