import * as vscode from 'vscode';
import type { DriftTarget } from 'faf-cli';
import {
  driftLabel,
  isViewModel,
  type FafOutcome,
  type FafViewModel,
  type HudGroup,
  type SlotView,
} from '../model';
import { REVEAL_SLOT_COMMAND } from './reveal';

/** The tree view id — also wired in package.json `contributes.views`. */
export const HUD_VIEW_ID = 'faf-context.hud';

/** `contextValue` on the Drift group node — the "Sync" menu targets this. */
export const DRIFT_CONTEXT_VALUE = 'faf.drift';

type HudNode =
  | { kind: 'message'; text: string }
  | { kind: 'header'; vm: FafViewModel }
  | { kind: 'group'; vm: FafViewModel; group: HudGroup }
  | { kind: 'slot'; vm: FafViewModel; slot: SlotView }
  | { kind: 'drift-root'; vm: FafViewModel }
  | { kind: 'drift-target'; target: DriftTarget };

const STATE_ICON: Record<SlotView['state'], vscode.ThemeIcon> = {
  populated: new vscode.ThemeIcon('circle-filled'),
  empty: new vscode.ThemeIcon('circle-outline'),
  slotignored: new vscode.ThemeIcon('dash'),
};

const STATE_GLYPH: Record<SlotView['state'], string> = {
  populated: '●',
  empty: '○',
  slotignored: '—',
};

const DRIFT_ICON: Record<DriftTarget['status'], vscode.ThemeIcon> = {
  newer: new vscode.ThemeIcon('warning'),
  older: new vscode.ThemeIcon('history'),
  'in-sync': new vscode.ThemeIcon('check'),
  missing: new vscode.ThemeIcon('circle-slash'),
};

/**
 * The Activity-Bar sidebar. `refresh(outcome)` is the only mutator — hand it an
 * outcome and the whole tree re-renders.
 */
export class HudTreeProvider implements vscode.TreeDataProvider<HudNode> {
  private outcome: FafOutcome = { kind: 'no-workspace' };

  private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(outcome: FafOutcome): void {
    this.outcome = outcome;
    this._onDidChangeTreeData.fire();
  }

  getChildren(node?: HudNode): HudNode[] {
    if (!node) {
      return this.roots();
    }
    switch (node.kind) {
      case 'group':
        return node.group.slots.map((slot) => ({
          kind: 'slot' as const,
          vm: node.vm,
          slot,
        }));
      case 'drift-root':
        return (node.vm.drift?.targets ?? []).map((target) => ({
          kind: 'drift-target' as const,
          target,
        }));
      default:
        return [];
    }
  }

  getTreeItem(node: HudNode): vscode.TreeItem {
    switch (node.kind) {
      case 'message':
        return new vscode.TreeItem(node.text, vscode.TreeItemCollapsibleState.None);
      case 'header':
        return this.headerItem(node.vm);
      case 'group':
        return this.groupItem(node.group);
      case 'slot':
        return this.slotItem(node.vm, node.slot);
      case 'drift-root':
        return this.driftRootItem(node.vm);
      case 'drift-target':
        return this.driftTargetItem(node.target);
    }
  }

  private roots(): HudNode[] {
    if (!isViewModel(this.outcome)) {
      return [
        {
          kind: 'message',
          text:
            this.outcome.kind === 'no-workspace'
              ? 'No workspace folder open.'
              : 'No project.faf — run faf init to author one.',
        },
      ];
    }
    const vm = this.outcome;
    const nodes: HudNode[] = [
      { kind: 'header', vm },
      ...vm.hudGroups.map((group) => ({ kind: 'group' as const, vm, group })),
    ];
    if (vm.drift) {
      nodes.push({ kind: 'drift-root', vm });
    }
    return nodes;
  }

  private headerItem(vm: FafViewModel): vscode.TreeItem {
    const item = new vscode.TreeItem(
      `${vm.tierGlyph} ${vm.score}%  ${vm.tierName}`,
      vscode.TreeItemCollapsibleState.None,
    );
    item.description = vm.nextTier
      ? `${vm.nextTier.gap} to ${vm.nextTier.name}`
      : 'Trophy';
    item.tooltip = `${vm.counts.populated}/${vm.counts.active} slots populated · ${vm.counts.total} total`;
    item.contextValue = 'faf.header';
    return item;
  }

  private groupItem(group: HudGroup): vscode.TreeItem {
    const item = new vscode.TreeItem(
      group.label,
      vscode.TreeItemCollapsibleState.Collapsed,
    );
    const parts: string[] = [`● ${group.populated}`];
    if (group.empty > 0) {
      parts.push(`○ ${group.empty}`);
    }
    if (group.ignored > 0) {
      parts.push(`— ${group.ignored}`);
    }
    item.description = parts.join('  ');
    item.contextValue = `faf.group.${group.key}`;
    return item;
  }

  private slotItem(vm: FafViewModel, slot: SlotView): vscode.TreeItem {
    const item = new vscode.TreeItem(
      slot.label,
      vscode.TreeItemCollapsibleState.None,
    );
    item.iconPath = STATE_ICON[slot.state];
    item.description =
      slot.state === 'populated' ? undefined : slot.state === 'empty' ? 'empty' : 'N/A';
    item.tooltip = `${slot.path} · ${STATE_GLYPH[slot.state]} ${slot.state}`;
    item.contextValue = `faf.slot.${slot.state}`;
    if (slot.state === 'empty') {
      item.command = {
        command: REVEAL_SLOT_COMMAND,
        title: 'Open in project.faf',
        arguments: [vm.sourcePath, slot.path],
      };
    }
    return item;
  }

  private driftRootItem(vm: FafViewModel): vscode.TreeItem {
    const report = vm.drift!;
    const item = new vscode.TreeItem(
      'Drift',
      vscode.TreeItemCollapsibleState.Expanded,
    );
    item.description =
      report.drifted > 0
        ? `${report.drifted} to sync`
        : report.missing > 0
          ? `${report.missing} missing`
          : 'in sync';
    item.tooltip = 'AI-context files vs project.faf (mtime)';
    item.contextValue = DRIFT_CONTEXT_VALUE;
    return item;
  }

  private driftTargetItem(target: DriftTarget): vscode.TreeItem {
    const item = new vscode.TreeItem(
      target.file,
      vscode.TreeItemCollapsibleState.None,
    );
    item.iconPath = DRIFT_ICON[target.status];
    item.description = driftLabel(target);
    item.contextValue = `faf.drift.${target.status}`;
    if (target.status === 'newer') {
      item.tooltip = `${target.file} is newer than project.faf — run FAF: Sync Context Files`;
    }
    return item;
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
