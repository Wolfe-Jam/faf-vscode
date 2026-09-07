/**
 * The one module that calls faf-cli's scoring + rendering. Everything
 * downstream consumes the `FafOutcome` it returns (or the HTML string from
 * `renderProjectHtml`) and never touches faf-cli directly.
 */
import { dirname } from 'node:path';
import {
  computeDrift,
  findFafFile,
  generateProjectHtml,
  readFaf,
  readFafRaw,
  scoreFafYaml,
} from 'faf-cli';
import type { ScoreResult } from 'faf-cli';
import { buildViewModel, type FafOutcome } from './model';

/**
 * Locate + score the workspace's `project.faf`, and read its context-file drift.
 *
 * - `undefined` root  -> `{ kind: 'no-workspace' }`
 * - no `project.faf`  -> `{ kind: 'no-faf' }`
 * - otherwise         -> a `FafViewModel` (drift is best-effort — never fatal)
 */
export function scoreWorkspace(root: string | undefined): FafOutcome {
  if (!root) {
    return { kind: 'no-workspace' };
  }
  const fafPath = findFafFile(root);
  if (!fafPath) {
    return { kind: 'no-faf' };
  }

  const score = scoreFafYaml(readFafRaw(fafPath));

  let projectName: string | undefined;
  try {
    projectName = readFaf(fafPath).project?.name;
  } catch {
    projectName = undefined;
  }

  let drift;
  try {
    drift = computeDrift(fafPath, dirname(fafPath));
  } catch {
    drift = undefined;
  }

  return buildViewModel(score, fafPath, { drift, projectName });
}

/**
 * The context card's HTML — faf-cli's single-source renderer, unmodified.
 * The webview layer injects the CSP; it does not touch the body.
 *
 * `score` is the already-computed `ScoreResult` from `scoreWorkspace` (stashed
 * on the view model). Passing it skips a re-score — the only re-parse left is
 * the cheap `readFaf` YAML load for the card body.
 */
export function renderProjectHtml(fafPath: string, score?: ScoreResult): string {
  const data = readFaf(fafPath);
  const result = score ?? scoreFafYaml(readFafRaw(fafPath));
  return generateProjectHtml(data, result, fafPath);
}
