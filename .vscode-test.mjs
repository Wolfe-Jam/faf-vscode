import { defineConfig } from '@vscode/test-cli';

// Tier 2 (Engine) — a real VS Code extension host against a fixture workspace.
//
// CI-only. Needs a full VS Code download + a display (xvfb-run on Linux), so it
// does NOT run in a headless agent env. Wired for the Phase 4 CI matrix.
//
// Run locally: `bun install` (once faf-cli 7.11.0 resolves) then
// `npm run test:integration` (tsc compiles test/integration -> out-integration).
export default defineConfig({
  files: 'out-integration/test/integration/**/*.test.js',
  workspaceFolder: 'test/fixtures/ws-trophy',
  version: 'stable',
  mocha: {
    ui: 'tdd',
    timeout: 20000,
  },
});
