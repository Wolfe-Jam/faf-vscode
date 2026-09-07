/**
 * Pure view-model layer for the FAF status HUD.
 *
 * No `vscode`, no `fs`, no faf-cli scoring calls. `buildViewModel` takes a
 * faf-cli `ScoreResult` and flattens it into the shape the views render.
 * `SLOT_BY_PATH`, `getNextTier` and `FAF_HEX` are imported as pure constants.
 */
import { SLOT_BY_PATH, getNextTier, FAF_HEX } from 'faf-cli';
import type { ScoreResult, SlotState, SlotCategory } from 'faf-cli';

/** One scored slot, ready for a tree row. */
export interface SlotView {
  path: string;
  label: string;
  state: SlotState;
  category: SlotCategory;
}

/** Slot tallies straight off the `ScoreResult`. */
export interface FafCounts {
  populated: number;
  empty: number;
  ignored: number;
  active: number;
  total: number;
}

/** The full view model — everything a view needs, nothing it does not. */
export interface FafViewModel {
  score: number;
  tierName: string;
  tierGlyph: string;
  /** Brand hex for the top four tiers; `null` means "use the theme default". */
  tierHex: string | null;
  nextTier: { name: string; gap: number } | null;
  counts: FafCounts;
  slots: SlotView[];
  grouped: Partial<Record<SlotCategory, SlotView[]>>;
  inherited: boolean;
  sourcePath: string;
}

/** What the engine hands back — a model, or a reason there is none. */
export type FafOutcome =
  | FafViewModel
  | { kind: 'no-workspace' }
  | { kind: 'no-faf' };

export function isViewModel(outcome: FafOutcome): outcome is FafViewModel {
  return !('kind' in outcome);
}

// Tier -> glyph. Built here, never parsed from `tier.indicator` (raw ANSI).
const TIER_GLYPH: Record<string, string | undefined> = {
  TROPHY: '✪', // ✪
  GOLD: '★', // ★
  SILVER: '◆', // ◆
  BRONZE: '◇', // ◇
  GREEN: '●', // ●
  YELLOW: '●', // ●
  RED: '○', // ○
  WHITE: '♡', // ♡
};

// Tier -> brand hex. Only the top four carry a colour; the rest ride the theme.
const TIER_HEX: Record<string, string | undefined> = {
  TROPHY: FAF_HEX.orange,
  GOLD: FAF_HEX.orange,
  SILVER: FAF_HEX.cyan,
  BRONZE: FAF_HEX.cyanDeep,
};

export function tierGlyph(name: string): string {
  return TIER_GLYPH[name] ?? '●';
}

export function tierHex(name: string): string | null {
  return TIER_HEX[name] ?? null;
}

export function buildViewModel(score: ScoreResult, fafPath: string): FafViewModel {
  const slots: SlotView[] = Object.entries(score.slots).map(([path, state]) => {
    const def = SLOT_BY_PATH.get(path);
    return {
      path,
      label: def?.label ?? def?.description ?? path,
      state,
      category: def?.category ?? 'project',
    };
  });

  const grouped: Partial<Record<SlotCategory, SlotView[]>> = {};
  for (const slot of slots) {
    (grouped[slot.category] ??= []).push(slot);
  }

  const next = getNextTier(score.score);
  const nextTier = next
    ? { name: next.name, gap: Math.max(0, next.threshold - score.score) }
    : null;

  return {
    score: score.score,
    tierName: score.tier.name,
    tierGlyph: tierGlyph(score.tier.name),
    tierHex: tierHex(score.tier.name),
    nextTier,
    counts: {
      populated: score.populated,
      empty: score.empty,
      ignored: score.ignored,
      active: score.active,
      total: score.total,
    },
    slots,
    grouped,
    inherited: score.inherited ?? false,
    sourcePath: fafPath,
  };
}

export interface StatusBarText {
  text: string;
  tooltip: string;
}

/** `text` is the status-bar label; `tooltip` is the hover block. */
export function formatStatusBar(vm: FafViewModel): StatusBarText {
  const text = `${vm.tierGlyph} FAF ${vm.score}%`;
  const lines = [`FAF · ${vm.tierName}`];
  if (vm.nextTier) {
    lines.push(`${vm.nextTier.gap} to ${vm.nextTier.name}`);
  }
  lines.push(`${vm.counts.populated}/${vm.counts.active} slots populated`);
  return { text, tooltip: lines.join('\n') };
}
