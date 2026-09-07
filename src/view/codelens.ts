import * as vscode from 'vscode';
import {
  isViewModel,
  type FafOutcome,
  type FafViewModel,
  type HudGroup,
} from '../model';
import { REVEAL_SLOT_COMMAND } from '../commands';

/** Top-level `project.faf` section headers → the HUD group they map to. */
const SECTIONS: ReadonlyArray<{
  re: RegExp;
  key: HudGroup['key'];
  label: string;
}> = [
  { re: /^project:/, key: 'project', label: 'Project' },
  { re: /^human_context:/, key: 'human', label: 'Human Context' },
  { re: /^stack:/, key: 'stack', label: 'Stack' },
];

/**
 * A CodeLens above each top-level section header in `project.faf`
 * (`project:` / `human_context:` / `stack:` at column 0) with that section's
 * fill tally. Click → jump to the first empty slot in the section.
 *
 * The provider has no scoring of its own: `setModel` feeds it the current
 * `FafViewModel` (from `extension.ts`, same wiring as the tree) and it reads
 * the `hudGroups` tallies straight off it.
 */
export class FafCodeLensProvider implements vscode.CodeLensProvider {
  private vm: FafViewModel | undefined;

  private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  /** Feed the current outcome; fires a lens refresh. */
  setModel(outcome: FafOutcome): void {
    this.vm = isViewModel(outcome) ? outcome : undefined;
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const vm = this.vm;
    if (!vm) {
      return [];
    }
    const lines = document.getText().split('\n');
    const lenses: vscode.CodeLens[] = [];
    for (let i = 0; i < lines.length; i++) {
      const section = SECTIONS.find((s) => s.re.test(lines[i]!));
      if (!section) {
        continue;
      }
      const group = vm.hudGroups.find((g) => g.key === section.key);
      if (!group) {
        continue;
      }
      lenses.push(
        new vscode.CodeLens(
          new vscode.Range(i, 0, i, 0),
          lensCommand(vm, group, section.label),
        ),
      );
    }
    return lenses;
  }

  dispose(): void {
    this._onDidChangeCodeLenses.dispose();
  }
}

/**
 * `{glyph} {Section} — {populated}/{active} · {n} empty`, where `active` is the
 * section's scored (non-ignored) slot count and `glyph` is ● when the section
 * has no gaps, ○ when it does. Click reveals the first empty slot, or is inert
 * when the section is full.
 */
function lensCommand(
  vm: FafViewModel,
  group: HudGroup,
  label: string,
): vscode.Command {
  const active = group.populated + group.empty;
  const glyph = group.empty === 0 ? '●' : '○';
  const title = `${glyph} ${label} — ${group.populated}/${active} · ${group.empty} empty`;

  const firstEmpty = group.slots.find((s) => s.state === 'empty');
  return firstEmpty
    ? {
        title,
        command: REVEAL_SLOT_COMMAND,
        arguments: [vm.sourcePath, firstEmpty.path],
      }
    : { title, command: '' };
}
