import * as vscode from 'vscode';

/** The files a `project.faf` feeds — watched for out-of-editor edits. */
export const WATCH_GLOB = '{project.faf,CLAUDE.md,AGENTS.md,.cursorrules,GEMINI.md}';

/** Default debounce: scoring is sub-ms, so this only coalesces editor bursts. */
export const DEBOUNCE_MS = 150;

/**
 * Watch `project.faf` + its sync targets in `root`. Any create/change/delete is
 * debounced, then `onChange(fafChanged)` fires once — `fafChanged` is `true`
 * when `project.faf` itself was touched (or the event carried no path), so a
 * `CLAUDE.md`-only edit can skip the context-card re-render. The returned
 * Disposable clears the pending timer and tears down the watcher.
 */
export function createWatcher(
  root: string,
  onChange: (fafChanged: boolean) => void,
  delayMs: number = DEBOUNCE_MS,
): vscode.Disposable {
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(root, WATCH_GLOB),
  );

  let timer: ReturnType<typeof setTimeout> | undefined;
  let fafDirty = false;

  const fire = (uri?: { fsPath: string }): void => {
    if (!uri || /(?:^|[\\/])project\.faf$/.test(uri.fsPath)) {
      fafDirty = true;
    }
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = undefined;
      const dirty = fafDirty;
      fafDirty = false;
      onChange(dirty);
    }, delayMs);
  };

  const subs = [
    watcher.onDidChange(fire),
    watcher.onDidCreate(fire),
    watcher.onDidDelete(fire),
    watcher,
  ];

  return new vscode.Disposable(() => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    for (const sub of subs) {
      sub.dispose();
    }
  });
}
