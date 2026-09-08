# FAF — Project Context

A human-facing HUD for your `project.faf`, inside the editor. Score, tier, and
drift at a glance; the context card rendered without leaving VS Code.

FAF is the **Foundational AI-context Format** — IANA-registered project DNA for
AI. This extension is the developer's viewport onto it. The AI's half is
[`faf-mcp`](https://www.npmjs.com/package/faf-mcp).

> **Screenshots** live on the [Marketplace listing](https://marketplace.visualstudio.com/items?itemName=faf.faf-context)
> once it is published. Until then: the status bar reads `✪ FAF 100%`, the
> Activity Bar gains a **FAF Context** panel, and the context card opens beside
> the editor.

## What it does

- **Status bar** — tier glyph + score (`✪ FAF 100%` / `◇ FAF 92%`). Tooltip:
  tier, gap to the next tier, populated-slot count. Click opens the context card.
- **Sidebar** (Activity Bar → **FAF Context**) — a score/tier header with the gap
  to the next tier, the 21 scored slots folded into three collapsible groups
  (Project / Human Context / Stack) with per-slot state, and a **Drift** group:
  one row per AI-context file (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`,
  `GEMINI.md`) showing its mtime relationship to `project.faf`, with an inline
  **Sync** action.
- **Context card** — **FAF: Open Context Card** (also the status-bar click) opens
  `faf-cli`'s single-source context-card render in a webview beside the editor:
  fully static, strict `default-src 'none'` CSP, scripts disabled.
- **CodeLens on `project.faf`** — one lens above each section header
  (`project:` / `human_context:` / `stack:`) with that section's fill tally;
  click to jump to the first empty slot.
- **Onboarding** — **FAF: Initialize project.faf** authors a starter file
  (palette-visible only when the workspace has none). **FAF: Sync Context Files**
  runs `faf sync --direction auto`. **FAF: Show DNA Journey** prints the
  birth→growth journey to the output channel. A three-step *Get started with FAF*
  walkthrough ties them together.
- **Watch** — `project.faf` and the four context files are watched; any change
  re-scores the HUD once, debounced 150 ms.

## Install

- **VS Code / Cursor / Windsurf:** search **FAF — Project Context** in the
  Extensions view, or `code --install-extension faf.faf-context`.
- **VSCodium / Open VSX IDEs:** install from
  [Open VSX](https://open-vsx.org/extension/faf/faf-context).

Then open a folder that contains a `project.faf` (or run **FAF: Initialize
project.faf** to author one).

## How it works

- One runtime dependency: [`faf-cli`](https://www.npmjs.com/package/faf-cli).
  Its **library** (`dist/index.js`) is bundled by esbuild into
  `dist/extension.js` for in-process scoring, drift, and the card render.
- **Init / Sync / DNA** run faf-cli's **CLI** (`dist/cli.js`, shipped inside the
  `.vsix`) with **VS Code's own Node** — `process.execPath` +
  `ELECTRON_RUN_AS_NODE=1`. No dependency on the user's `PATH`, no `npx`, no
  network.
- The scoring kernel (`faf-scoring-kernel`, Rust → WASM) stays external so its
  synchronous `__dirname` + `readFileSync` load resolves against real
  `node_modules`.
- Scoring, tiers, slots, drift, and the context card are 100% imported from
  `faf-cli` — the extension re-derives none of it.

### `faf-vscode` vs `faf-mcp`

| | Audience | Job |
|---|---|---|
| [`faf-mcp`](https://www.npmjs.com/package/faf-mcp) | the AI / agent | inject + sync context so the model answers right |
| **`faf-vscode`** (this) | the developer | show, at a glance, where `project.faf` stands; make score / sync / drift a one-click editor concern |

### Trust

`capabilities.untrustedWorkspaces` is `limited`: scoring, the sidebar, the card,
and drift work in an untrusted workspace. **Init**, **Sync**, and **DNA** spawn
the CLI, so they warn and no-op until you trust the workspace.

## Tier symbols

`✪ ★ ◆ ◇ ● ○ ♡` — never emoji or medals.

## Links

- [faf.one](https://faf.one) — the FAF home
- [docs.faf.one](https://docs.faf.one) — the format, scoring, and the CLI
- [`faf-cli` on npm](https://www.npmjs.com/package/faf-cli)

## Develop

```bash
npm install
npm run build            # esbuild bundle -> dist/extension.js
npm test                 # bun test test/unit
npm run smoke            # build + headless check through the bundled dist
npm run typecheck        # tsc --noEmit (strict)
npm run package          # vsce package -> .vsix
npm run test:integration # Tier 2 — real VS Code host. Needs a display (xvfb on Linux CI).
```

## License

MIT
