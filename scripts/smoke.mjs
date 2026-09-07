// Phase 0 smoke check — no F5, no Electron.
// Stubs the `vscode` module, loads the BUNDLED dist/extension.js, runs the
// exact calls activate() makes against a real project.faf, asserts 100/TROPHY.
import { createRequire } from 'node:module';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, statSync, rmSync } from 'node:fs';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const TARGET = process.env.FAF_TARGET ?? '/Users/wolfejam/FAF/cli';

const lines = [];
const vscodeStub = {
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

const storage = join(repoRoot, '.smoke-storage');
rmSync(storage, { recursive: true, force: true });
const context = {
  subscriptions: [],
  globalStorageUri: { fsPath: storage },
  extensionPath: repoRoot,
};

const api = ext.activate(context);

console.log('--- output channel ---');
for (const l of lines) console.log('  ' + l);
console.log('--- activate() returned ---');
console.log(' ', api);
console.log();

assert.ok(api, 'activate() returned undefined — no project.faf found at target?');
assert.equal(api.score, 100, `expected score 100, got ${api.score}`);
assert.equal(api.tier, 'TROPHY', `expected tier TROPHY, got ${api.tier}`);

const card = join(storage, 'context-card.html');
assert.ok(existsSync(card), 'context card was not written');
assert.ok(statSync(card).size > 0, 'context card is empty');

ext.deactivate();

console.log(`PASS  score=${api.score}  tier=${api.tier}  card=${statSync(card).size}B  (bundled path)`);
