/**
 * Version-locked FAF CLI runner. Runs the faf-cli that ships *inside* the
 * extension with VS Code's own Node (`process.execPath` + `ELECTRON_RUN_AS_NODE`)
 * — no dependency on the user's PATH, no network, no `npx`.
 */
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { fafOutput } from '../channel';

const nodeRequire = createRequire(import.meta.url);

/** Strip SGR colour codes so the output channel stays readable. */
const ANSI = new RegExp('\\u001b\\[[0-9;]*m', 'g');

export interface FafRunResult {
  code: number;
  output: string;
}

/**
 * Locate the bundled faf-cli entry point.
 *
 * Primary: the copy `vsce package` ships under the extension
 * (`<ext>/node_modules/faf-cli/dist/cli.js`) — also what the `bun link` symlink
 * resolves to in dev. Fallback: resolve the `faf-cli` package from here and swap
 * `index.js` → `cli.js`. Throws when neither exists.
 */
export function resolveFafCli(extensionPath: string): string {
  const shipped = path.join(
    extensionPath,
    'node_modules',
    'faf-cli',
    'dist',
    'cli.js',
  );
  if (existsSync(shipped)) {
    return shipped;
  }
  try {
    const main = nodeRequire.resolve('faf-cli'); // → …/faf-cli/dist/index.js
    const cli = path.join(path.dirname(main), 'cli.js');
    if (existsSync(cli)) {
      return cli;
    }
  } catch {
    // fall through to the throw below
  }
  throw new Error(
    `bundled faf-cli not found (looked at ${shipped} and the resolved faf-cli package)`,
  );
}

/**
 * Run the bundled faf-cli. Wraps the spawn in a notification-area progress
 * spinner, streams stdout/stderr to the FAF output channel, and resolves with
 * the exit code + the captured (de-ANSI'd) output.
 */
export function runBundledFaf(
  extensionPath: string,
  args: string[],
  opts: { cwd: string; title: string },
): Thenable<FafRunResult> {
  const cliJs = resolveFafCli(extensionPath);
  const channel = fafOutput();
  channel.appendLine(`\n$ faf ${args.join(' ')}`);
  channel.appendLine(`  ${process.execPath} ${cliJs}`);
  channel.appendLine(`  cwd  ${opts.cwd}`);

  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: opts.title,
      cancellable: false,
    },
    () =>
      new Promise<FafRunResult>((resolve) => {
        let output = '';
        let done = false;
        const finish = (code: number): void => {
          if (done) {
            return;
          }
          done = true;
          channel.appendLine(`  → exit ${code}`);
          resolve({ code, output: output.replace(ANSI, '') });
        };

        const child = execFile(process.execPath, [cliJs, ...args], {
          cwd: opts.cwd,
          env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
          maxBuffer: 16 * 1024 * 1024,
        });

        const pump = (chunk: Buffer | string): void => {
          const text = chunk.toString();
          output += text;
          for (const line of text.split('\n')) {
            const clean = line.replace(ANSI, '').replace(/\r$/, '');
            if (clean.length > 0) {
              channel.appendLine(clean);
            }
          }
        };

        child.stdout?.on('data', pump);
        child.stderr?.on('data', pump);
        child.on('error', (err) => {
          channel.appendLine(`  ! ${String(err)}`);
          finish(1);
        });
        child.on('close', (code) => finish(code ?? 0));
      }),
  );
}

/**
 * Trust gate for the commands that spawn the CLI (Init / Sync / DNA). Returns
 * `true` when it is safe to run; otherwise warns and returns `false`.
 */
export function ensureTrusted(): boolean {
  if (vscode.workspace.isTrusted) {
    return true;
  }
  void vscode.window.showWarningMessage(
    'Trust this workspace to run FAF Sync/Init.',
  );
  return false;
}
