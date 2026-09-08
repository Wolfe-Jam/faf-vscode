/**
 * The public API surface `activate` returns — a test seam, harmless in
 * production. Kept in its own leaf module so the Tier 2 integration suite can
 * `import type` it under `tsconfig.integration.json` (CommonJS) without pulling
 * in `src/faf/run.ts`, which uses `import.meta.url` (fine for the esbuild
 * bundle, a compile error under CommonJS).
 */
import type { HudTreeProvider } from './view/sidebar';
import type { FafOutcome } from './model';

export interface FafExtensionApi {
  statusBarText(): string | undefined;
  hud: HudTreeProvider;
  outcome(): FafOutcome;
}
