/**
 * Pure view-model layer for the FAF status HUD.
 *
 * No `vscode`, no `fs`, no faf-cli scoring calls. `buildViewModel` takes a
 * faf-cli `ScoreResult` and flattens it into the shape the views render.
 * `SLOT_BY_PATH`, `getNextTier` and `FAF_HEX` are imported as pure constants.
 */
import { SLOT_BY_PATH, getNextTier, FAF_HEX } from 'faf-cli';
import type {
  ScoreResult,
  SlotState,
  SlotCategory,
  DriftReport,
  DriftTarget,
} from 'faf-cli';

/** One scored slot, ready for a tree row. */
export interface SlotView {
  path: string;
  label: string;
  state: SlotState;
  category: SlotCategory;
}

/** A HUD display group — the three the sidebar renders. */
export interface HudGroup {
  key: 'project' | 'human' | 'stack';
  label: string;
  slots: SlotView[];
  populated: number;
  empty: number;
  ignored: number;
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
  /** The three collapsible groups the sidebar renders, in display order. */
  hudGroups: HudGroup[];
  /** mtime drift of the AI-context files vs `project.faf`. Undefined if the
   *  engine could not read it (never fatal to the HUD). */
  drift?: DriftReport;
  /** The raw faf-cli score, stashed so the context-card path reuses it instead
   *  of re-scoring (`renderProjectHtml` takes it as an optional arg). */
  scoreResult: ScoreResult;
  inherited: boolean;
  sourcePath: string;
  /** `project.name` from the .faf, for the context-card panel title. */
  projectName: string;
}

/** Optional extras the engine threads in alongside the raw `ScoreResult`. */
export interface ViewModelExtras {
  drift?: DriftReport;
  projectName?: string;
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

// Slot category -> HUD display group. frontend/backend/universal collapse into
// Stack; the enterprise_* categories are slots 22–33 and never reach `faf score`
// output — if one somehow does, it folds into Stack too (never its own group).
const GROUP_OF: Record<SlotCategory, HudGroup['key']> = {
  project: 'project',
  human: 'human',
  frontend: 'stack',
  backend: 'stack',
  universal: 'stack',
  enterprise_infra: 'stack',
  enterprise_app: 'stack',
  enterprise_ops: 'stack',
};

const GROUP_ORDER: HudGroup['key'][] = ['project', 'human', 'stack'];
const GROUP_LABEL: Record<HudGroup['key'], string> = {
  project: 'Project',
  human: 'Human Context',
  stack: 'Stack',
};

/** Fold the 21 scored slots into the three collapsible sidebar groups. */
export function hudGroups(slots: SlotView[]): HudGroup[] {
  const buckets = new Map<HudGroup['key'], SlotView[]>(
    GROUP_ORDER.map((k) => [k, []]),
  );
  for (const slot of slots) {
    buckets.get(GROUP_OF[slot.category] ?? 'stack')!.push(slot);
  }
  return GROUP_ORDER.map((key) => {
    const groupSlots = buckets.get(key)!;
    return {
      key,
      label: GROUP_LABEL[key],
      slots: groupSlots,
      populated: groupSlots.filter((s) => s.state === 'populated').length,
      empty: groupSlots.filter((s) => s.state === 'empty').length,
      ignored: groupSlots.filter((s) => s.state === 'slotignored').length,
    };
  });
}

/** Bare magnitude of a time delta — "2m" / "5h" / "3d", or `null` under a minute. */
export function coarseSpan(ms: number): string | null {
  const sec = Math.round(Math.abs(ms) / 1000);
  if (sec < 60) {
    return null;
  }
  const min = Math.round(sec / 60);
  if (min < 60) {
    return `${min}m`;
  }
  const hr = Math.round(min / 60);
  if (hr < 24) {
    return `${hr}h`;
  }
  return `${Math.round(hr / 24)}d`;
}

/** A coarse "3d ago" / "5h ago" / "just now" from an absolute ms delta. */
export function formatAge(ms: number): string {
  const span = coarseSpan(ms);
  return span ? `${span} ago` : 'just now';
}

/** The one-line status a drift row shows next to the file name. */
export function driftLabel(target: DriftTarget): string {
  switch (target.status) {
    case 'newer': {
      // The target is NEWER than project.faf, so the .faf needs a sync. "ago"
      // would be backwards; render the magnitude as "… newer", and drop it
      // under a minute so it never reads "just now newer".
      if (target.delta_ms == null) {
        return 'needs sync';
      }
      const span = coarseSpan(target.delta_ms);
      return span ? `needs sync · ${span} newer` : 'needs sync';
    }
    case 'older':
      return target.delta_ms != null ? `older · ${formatAge(target.delta_ms)}` : 'older';
    case 'in-sync':
      return 'in sync';
    case 'missing':
      return 'missing';
  }
}

export function buildViewModel(
  score: ScoreResult,
  fafPath: string,
  extras: ViewModelExtras = {},
): FafViewModel {
  const slots: SlotView[] = Object.entries(score.slots).map(([path, state]) => {
    const def = SLOT_BY_PATH.get(path);
    return {
      path,
      label: def?.label ?? def?.description ?? path,
      state,
      // Unknown path → Stack (via GROUP_OF: universal → 'stack'), matching the
      // stated intent. Never triggers today — `ScoreResult.slots` is the known
      // 21, all in `SLOT_BY_PATH`.
      category: def?.category ?? 'universal',
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
    hudGroups: hudGroups(slots),
    drift: extras.drift,
    scoreResult: score,
    inherited: score.inherited ?? false,
    sourcePath: fafPath,
    projectName: extras.projectName ?? 'Project',
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
