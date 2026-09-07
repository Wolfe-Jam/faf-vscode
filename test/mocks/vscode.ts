/**
 * Hand-written `vscode` module mock — only the surface the extension touches.
 * Registered as the `vscode` module by test/setup.ts (bunfig `preload`).
 *
 * The `__`-prefixed exports are test hooks: captured items/channels/commands/
 * trees/panels/terminals/watchers and a settable `workspaceFolders`.
 */

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
}

export class ThemeColor {
  constructor(public readonly id: string) {}
}

export class ThemeIcon {
  constructor(
    public readonly id: string,
    public readonly color?: ThemeColor,
  ) {}
}

export class Disposable {
  constructor(private readonly onDispose: () => void) {}
  dispose(): void {
    this.onDispose();
  }
}

export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number,
  ) {}
}

export class Range {
  constructor(
    public readonly start: Position,
    public readonly end: Position,
  ) {}
}

export class Selection extends Range {}

export class RelativePattern {
  constructor(
    public readonly base: unknown,
    public readonly pattern: string,
  ) {}
}

export class EventEmitter<T> {
  private readonly listeners = new Set<(e: T) => void>();
  readonly event = (listener: (e: T) => void): Disposable => {
    this.listeners.add(listener);
    return new Disposable(() => this.listeners.delete(listener));
  };
  fire(data: T): void {
    for (const l of [...this.listeners]) {
      l(data);
    }
  }
  dispose(): void {
    this.listeners.clear();
  }
}

export class TreeItem {
  label: string;
  collapsibleState: TreeItemCollapsibleState;
  description?: string | boolean;
  tooltip?: string;
  iconPath?: unknown;
  contextValue?: string;
  command?: { command: string; title: string; arguments?: unknown[] };
  constructor(label: string, collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.None) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

// ---- captured state (asserted on by tests) --------------------------------

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

export interface MockWebviewPanel {
  viewType: string;
  title: string;
  disposed: boolean;
  revealed: number;
  webview: { html: string; options: unknown };
  options: unknown;
  reveal(): void;
  onDidDispose(cb: () => void): Disposable;
  dispose(): void;
}

export interface MockTerminal {
  name: string;
  options: unknown;
  shown: boolean;
  sent: string[];
  disposed: boolean;
  show(): void;
  sendText(text: string): void;
  dispose(): void;
}

export interface MockFileSystemWatcher {
  pattern: RelativePattern;
  disposed: boolean;
  handlers: { change: Array<() => void>; create: Array<() => void>; delete: Array<() => void> };
  onDidChange(cb: () => void): Disposable;
  onDidCreate(cb: () => void): Disposable;
  onDidDelete(cb: () => void): Disposable;
  dispose(): void;
  emitChange(): void;
}

interface MockFolder {
  uri: { fsPath: string };
  name: string;
  index: number;
}

export const __items: MockStatusBarItem[] = [];
export const __channels: MockOutputChannel[] = [];
export const __commands = new Map<string, (...args: unknown[]) => unknown>();
export const __trees = new Map<string, unknown>();
export const __panels: MockWebviewPanel[] = [];
export const __terminals: MockTerminal[] = [];
export const __watchers: MockFileSystemWatcher[] = [];
export const __openedDocs: string[] = [];
export const __shownDocs: Array<{ doc: unknown; options: unknown }> = [];
export const __infoMessages: string[] = [];

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
  __trees.clear();
  __panels.length = 0;
  __terminals.length = 0;
  __watchers.length = 0;
  __openedDocs.length = 0;
  __shownDocs.length = 0;
  __infoMessages.length = 0;
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

  registerTreeDataProvider(viewId: string, provider: unknown): Disposable {
    __trees.set(viewId, provider);
    return new Disposable(() => __trees.delete(viewId));
  },

  createWebviewPanel(
    viewType: string,
    title: string,
    _showOptions: unknown,
    options: unknown,
  ): MockWebviewPanel {
    const disposeCbs: Array<() => void> = [];
    const panel: MockWebviewPanel = {
      viewType,
      title,
      disposed: false,
      revealed: 0,
      webview: { html: '', options },
      options,
      reveal() {
        this.revealed++;
      },
      onDidDispose(cb: () => void) {
        disposeCbs.push(cb);
        return new Disposable(() => {});
      },
      dispose() {
        this.disposed = true;
        for (const cb of disposeCbs) {
          cb();
        }
      },
    };
    __panels.push(panel);
    return panel;
  },

  get terminals(): MockTerminal[] {
    return __terminals;
  },

  createTerminal(options: { name: string; cwd?: string }): MockTerminal {
    const terminal: MockTerminal = {
      name: options.name,
      options,
      shown: false,
      sent: [],
      disposed: false,
      show() {
        this.shown = true;
      },
      sendText(text: string) {
        this.sent.push(text);
      },
      dispose() {
        this.disposed = true;
      },
    };
    __terminals.push(terminal);
    return terminal;
  },

  showTextDocument(doc: unknown, options: unknown): Promise<unknown> {
    __shownDocs.push({ doc, options });
    return Promise.resolve(doc);
  },

  showInformationMessage(message: string): Promise<undefined> {
    __infoMessages.push(message);
    return Promise.resolve(undefined);
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
  getCommands(): Promise<string[]> {
    return Promise.resolve([...__commands.keys()]);
  },
};

export const workspace = {
  get workspaceFolders(): MockFolder[] | undefined {
    return __folders;
  },

  createFileSystemWatcher(pattern: RelativePattern): MockFileSystemWatcher {
    const handlers = {
      change: [] as Array<() => void>,
      create: [] as Array<() => void>,
      delete: [] as Array<() => void>,
    };
    const watcher: MockFileSystemWatcher = {
      pattern,
      disposed: false,
      handlers,
      onDidChange(cb: () => void) {
        handlers.change.push(cb);
        return new Disposable(() => {});
      },
      onDidCreate(cb: () => void) {
        handlers.create.push(cb);
        return new Disposable(() => {});
      },
      onDidDelete(cb: () => void) {
        handlers.delete.push(cb);
        return new Disposable(() => {});
      },
      dispose() {
        this.disposed = true;
      },
      emitChange() {
        for (const cb of handlers.change) {
          cb();
        }
      },
    };
    __watchers.push(watcher);
    return watcher;
  },

  openTextDocument(path: string): Promise<{ path: string }> {
    __openedDocs.push(path);
    return Promise.resolve({ path });
  },
};
