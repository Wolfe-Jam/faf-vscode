/**
 * Minimal hand-written `vscode` module mock — only the surface Phase 1 touches.
 * Registered as the `vscode` module by test/setup.ts (bunfig `preload`).
 *
 * The `__`-prefixed exports are test hooks: captured items/channels/commands and
 * a settable `workspaceFolders`.
 */

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export class ThemeColor {
  constructor(public readonly id: string) {}
}

export class Disposable {
  constructor(private readonly onDispose: () => void) {}
  dispose(): void {
    this.onDispose();
  }
}

export interface MockStatusBarItem {
  alignment: StatusBarAlignment;
  priority: number | undefined;
  text: string;
  tooltip: string | undefined;
  color: string | ThemeColor | undefined;
  command: string | undefined;
  shown: boolean;
  disposed: boolean;
  show(): void;
  hide(): void;
  dispose(): void;
}

export interface MockOutputChannel {
  name: string;
  lines: string[];
  disposed: boolean;
  appendLine(line: string): void;
  append(value: string): void;
  clear(): void;
  replace(value: string): void;
  show(): void;
  hide(): void;
  dispose(): void;
}

interface MockFolder {
  uri: { fsPath: string };
  name: string;
  index: number;
}

// ---- captured state (asserted on by tests) --------------------------------
export const __items: MockStatusBarItem[] = [];
export const __channels: MockOutputChannel[] = [];
export const __commands = new Map<string, (...args: unknown[]) => unknown>();

let __folders: MockFolder[] | undefined;

/** Set (or clear, with `undefined`) the mock workspace folders. */
export function __setWorkspaceFolders(paths: string[] | undefined): void {
  __folders =
    paths === undefined
      ? undefined
      : paths.map((fsPath, index) => ({ uri: { fsPath }, name: `ws${index}`, index }));
}

/** Wipe all captured state between tests. */
export function __reset(): void {
  __items.length = 0;
  __channels.length = 0;
  __commands.clear();
  __folders = undefined;
}

export const window = {
  createStatusBarItem(alignment: StatusBarAlignment, priority?: number): MockStatusBarItem {
    const item: MockStatusBarItem = {
      alignment,
      priority,
      text: '',
      tooltip: undefined,
      color: undefined,
      command: undefined,
      shown: false,
      disposed: false,
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
    __items.push(item);
    return item;
  },

  createOutputChannel(name: string): MockOutputChannel {
    const channel: MockOutputChannel = {
      name,
      lines: [],
      disposed: false,
      appendLine(line: string) {
        this.lines.push(line);
      },
      append(value: string) {
        this.lines.push(value);
      },
      clear() {
        this.lines.length = 0;
      },
      replace(value: string) {
        this.lines.splice(0, this.lines.length, value);
      },
      show() {},
      hide() {},
      dispose() {
        this.disposed = true;
      },
    };
    __channels.push(channel);
    return channel;
  },
};

export const commands = {
  registerCommand(command: string, callback: (...args: unknown[]) => unknown): Disposable {
    __commands.set(command, callback);
    return new Disposable(() => {
      __commands.delete(command);
    });
  },
  executeCommand(command: string, ...args: unknown[]): unknown {
    return __commands.get(command)?.(...args);
  },
};

export const workspace = {
  get workspaceFolders(): MockFolder[] | undefined {
    return __folders;
  },
};
