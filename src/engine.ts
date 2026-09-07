/**
 * The one module that calls faf-cli's scoring. Everything downstream consumes
 * the `FafOutcome` it returns and never touches faf-cli directly.
 */
import { findFafFile, readFafRaw, scoreFafYaml } from 'faf-cli';
import { buildViewModel, type FafOutcome } from './model';

/**
 * Locate + score the workspace's `project.faf`.
 *
 * - `undefined` root  -> `{ kind: 'no-workspace' }`
 * - no `project.faf`  -> `{ kind: 'no-faf' }`
 * - otherwise         -> a `FafViewModel`
 */
export function scoreWorkspace(root: string | undefined): FafOutcome {
  if (!root) {
    return { kind: 'no-workspace' };
  }
  const fafPath = findFafFile(root);
  if (!fafPath) {
    return { kind: 'no-faf' };
  }
  return buildViewModel(scoreFafYaml(readFafRaw(fafPath)), fafPath);
}
