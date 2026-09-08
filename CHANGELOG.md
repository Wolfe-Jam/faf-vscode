# Changelog

All notable changes to the **FAF — Project Context** extension are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-09-08

### Added

- **Marketplace screenshot** — the README now leads with a screenshot of the
  sidebar and the rendered context card side by side, scoring `faf-cli` itself
  at 100% Trophy.

## [0.1.0] - 2026-09-08

First public release. The extension is a human-facing HUD for your
`project.faf` — it shows where the file stands (score, tier, drift) and renders
its context card, all without leaving the editor. Scoring, tiers, slots, drift,
and the card render are imported wholesale from [`faf-cli`](https://www.npmjs.com/package/faf-cli);
the extension re-derives none of it. This is the developer's half of FAF — the
AI's half is the [`faf-mcp`](https://www.npmjs.com/package/faf-mcp) server.

### Added

- **Status bar** — tier glyph + score (`✪ FAF 100%`), with a tooltip carrying
  the tier, the gap to the next tier, and the populated-slot count. Click opens
  the context card.
- **Sidebar** (Activity Bar → FAF Context) — a score/tier header with the gap to
  the next tier; the 21 scored slots folded into three groups (Project / Human
  Context / Stack) with per-slot state; and a **Drift** group with one row per
  AI-context file (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `GEMINI.md`) showing
  its mtime relationship to `project.faf`, plus an inline Sync action.
- **Context card** — a webview rendering `faf-cli`'s single-source context-card
  output beside the editor: fully static, strict `default-src 'none'` CSP,
  scripts disabled.
- **CodeLens on `project.faf`** — one lens above each section header
  (`project:` / `human_context:` / `stack:`) with that section's fill tally;
  click to jump to the first empty slot.
- **Drift** — `computeDrift` from `faf-cli` 7.11.0, read in-process, powers the
  Drift group and the status-channel line.
- **Commands** — **FAF: Refresh Score**, **FAF: Open Context Card**,
  **FAF: Open project.faf**, **FAF: Sync Context Files**
  (`faf sync --direction auto`), **FAF: Initialize project.faf** (`faf init`,
  palette-visible only when the workspace has none), **FAF: Show DNA Journey**
  (`faf dna`).
- **Init / Sync / DNA** spawn the version-locked `faf-cli` shipped inside the
  `.vsix` with VS Code's own Node (`process.execPath` + `ELECTRON_RUN_AS_NODE`) —
  no dependency on the user's `PATH`, no `npx`, no network.
- **Walkthrough** — *Get started with FAF*: author the file, fill the six W's,
  watch the score climb.
- **Watch** — `project.faf` and the four context files are watched; any change
  re-scores the HUD once, debounced 150 ms. The card re-renders only when
  `project.faf` itself changed or the score moved.
- **Trust** — `capabilities.untrustedWorkspaces` is `limited`: scoring, the
  sidebar, the card, and drift work in an untrusted workspace; Init, Sync, and
  DNA warn and no-op until the workspace is trusted.

[0.1.1]: https://github.com/Wolfe-Jam/faf-vscode/releases/tag/v0.1.1
[0.1.0]: https://github.com/Wolfe-Jam/faf-vscode/releases/tag/v0.1.0
