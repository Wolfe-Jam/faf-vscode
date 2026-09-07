# FAF — Project Context

A human-facing HUD for your `project.faf`, inside the editor. Score, tier, and
drift at a glance; the context card rendered without leaving VS Code.

FAF is the **Foundational AI-context Format** — IANA-registered project DNA for AI.
This extension is the developer's viewport onto it. The AI's half is [`faf-mcp`](https://www.npmjs.com/package/faf-mcp).

## Status

**Phase 3 — Onboarding.** On top of the Phase 1/2 HUD:

- **Sidebar** (Activity Bar → FAF Context): a score/tier header with the gap to
  the next tier, the 21 scored slots folded into three collapsible groups
  (Project / Human Context / Stack) with per-slot state, and a **Drift** group —
  one row per AI-context file (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`,
  `GEMINI.md`) showing its mtime relationship to `project.faf`.
- **Context card** — **FAF: Open Context Card** (also the status-bar click) opens
  `faf-cli`'s single-source context-card render in a webview beside the editor,
  static, with a strict `default-src 'none'` CSP and scripts disabled.
- **CodeLens on `project.faf`** — one lens above each section header
  (`project:` / `human_context:` / `stack:`) with that section's fill tally;
  click to jump to the first empty slot.
- **`FAF: Initialize project.faf`** — authors a starter `project.faf` (visible in
  the palette only when the workspace has none). **`FAF: Sync Context Files`**
  runs `faf sync --direction auto`. **`FAF: Show DNA Journey`** prints the
  birth→growth journey to the output channel.
- **Walkthrough** — *Get started with FAF*: author the file, fill the six W's,
  watch the score climb.
- **Watch** — `project.faf` and the four context files are watched; any change
  re-scores the HUD once, debounced 150 ms. The context card re-renders only
  when `project.faf` itself changed or the score moved.

Status bar: tier glyph + score (`✪ FAF 100%`), tooltip with tier / gap / slot
count. **FAF: Refresh Score** forces a re-score.

## How it works

- One runtime dependency: [`faf-cli`](https://www.npmjs.com/package/faf-cli).
  Its **library** (`dist/index.js`) is bundled by esbuild into
  `dist/extension.js` for in-process scoring, drift, and the card render.
- **Init / Sync / DNA** run faf-cli's **CLI** (`dist/cli.js`, shipped inside the
  `.vsix`) with **VS Code's own Node** — `process.execPath` +
  `ELECTRON_RUN_AS_NODE=1`. No dependency on the user's `PATH`, no `npx`, no
  network. (VS Code does **not** ship a `node` on `PATH` — the earlier note that
  it did was wrong.) A terminal `npx` fallback fires only if the bundled CLI is
  genuinely unresolvable.
- The scoring kernel (`faf-scoring-kernel`, Rust → WASM) stays external so its
  synchronous `__dirname` + `readFileSync` load resolves against real
  `node_modules`.
- Scoring, tiers, slots, drift, and the context card are 100% imported from
  `faf-cli` — the extension re-derives none of it.

### Trust

`capabilities.untrustedWorkspaces` is `limited`: scoring, the sidebar, the card,
and drift work in an untrusted workspace. **Init**, **Sync**, and **DNA** spawn
the CLI, so they warn and no-op until you trust the workspace.

### Dependency note (Phase 3 → Phase 4)

Phase 3 uses `computeDrift` from `faf-cli`, on the unreleased `feat/drift-json`
branch. `package.json` pins the published target `faf-cli@^7.11.0`; local dev
links the checkout with `bun link` (`cd ~/FAF/cli && bun run build && bun link`
then `cd ~/FAF/faf-vscode && bun link faf-cli`). Until `faf-cli` 7.11.0
publishes, `npm ci`, `vsce package`, and `vsce ls` will **not** clean-resolve —
that verification (including confirming `faf-cli/dist` + `open` land in the
`.vsix`) is **Phase 4**. All Phase 3 `bun test`, `npm run build`, and
`npm run smoke` run against the linked build.

## Develop

```bash
# one-time: link the local faf-cli build (drift branch)
( cd ../cli && git checkout feat/drift-json && bun run build && bun link )
bun link faf-cli

npm run build            # esbuild bundle -> dist/extension.js
npm test                 # bun test test/unit
npm run smoke            # build + headless check through the bundled dist
npm run typecheck        # tsc --noEmit (strict)
npm run test:integration # Tier 2 — real VS Code host. CI-only, needs a display + published faf-cli.
```

Tier 3 real-host checks (theme parity, walkthrough step completion, slot-click
landing on the right line) need a VS Code extension host and are **Phase 4 CI**.

## Tier symbols

`✪ ★ ◆ ◇ ● ○ ♡` — never emoji or medals.

## License

MIT
