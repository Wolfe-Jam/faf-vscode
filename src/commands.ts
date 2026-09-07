/** Command ids — the single source, mirrored in package.json `contributes`. */
export const REFRESH_COMMAND = 'faf-context.refresh';
export const OPEN_CARD_COMMAND = 'faf-context.openCard';
export const OPEN_FAF_COMMAND = 'faf-context.openFaf';
export const SYNC_COMMAND = 'faf-context.sync';
export const INIT_COMMAND = 'faf-context.init';
export const SHOW_DNA_COMMAND = 'faf-context.showDna';
/** Internal — wired via `registerCommand`, deliberately not in the palette. */
export const REVEAL_SLOT_COMMAND = 'faf-context.revealSlot';

/** Context key: `true` once the workspace has a scored `project.faf`. */
export const HAS_FAF_CONTEXT = 'faf-context.hasFaf';
