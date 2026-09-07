# FAF — Project Context

A human-facing HUD for your `project.faf`, inside the editor. Score, tier, and
drift at a glance; the context card rendered without leaving VS Code.

FAF is the **Foundational AI-context Format** — IANA-registered project DNA for AI.
This extension is the developer's viewport onto it. The AI's half is [`faf-mcp`](https://www.npmjs.com/package/faf-mcp).

## Status

**Phase 2 — HUD.** On top of Phase 1's status bar:

- **Sidebar** (Activity Bar → FAF Context): a score/tier header with the gap to
  the next tier, the 21 scored slots folded into three collapsible groups
  (Project / Human Context / Stack) with per-slot state, and a **Drift** group —
  one row per AI-context file (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`,
  `GEMINI.md`) showing its mtime relationship to `project.faf`.
- **Context card** — **FAF: Open Context Card** (also the status-bar click) opens
  `faf-cli`'s single-source context-card render in a webview beside the editor,
  static, with a strict `default-src 'none'` CSP and scripts disabled.
- **Sync** — **FAF: Sync Context Files** runs `npx faf-cli sync` in a visible
  terminal (a user-initiated two-way write).
- **Watch** — `project.faf` and the four context files are watched; any change
  re-scores + re-renders the HUD once, debounced 150 ms.

Phase 1 status bar: tier glyph + score (`✪ FAF 100%`), tooltip with tier / gap /
slot count. **FAF: Refresh Score** forces a re-score.

CodeLens, the onboarding walkthrough, `FAF: Init`, and `FAF: Show DNA` are
Phase 3.

## How it works

- One runtime dependency: [`faf-cli`](https://www.npmjs.com/package/faf-cli),
  bundled by esbuild into `dist/extension.js`.
- The scoring kernel (`faf-scoring-kernel`, Rust to WASM) stays external so its
  synchronous `__dirname` + `readFileSync` load resolves against real
  `node_modules`.
- Scoring, tiers, slots, drift, and the context card are 100% imported from
  `faf-cli` — the extension re-derives none of it.

### Dependency note (Phase 2 → Phase 4)

Phase 2 uses `computeDrift` from `faf-cli`, which is on the unreleased
`feat/drift-json` branch. `package.json` pins the published target
`faf-cli@^7.11.0`; local dev links the checkout with
`bun link` (`cd ~/FAF/cli && bun link` then `cd ~/FAF/faf-vscode && bun link faf-cli`).
Until `faf-cli` 7.11.0 publishes, `npm ci` and `vsce package` will **not**
clean-resolve — that verification is **Phase 4**. All Phase 2 `bun test`,
`npm run build`, and `npm run smoke` run against the linked build.

## Develop

```bash
# one-time: link the local faf-cli build (drift branch)
( cd ../cli && bun run build && bun link )
bun link faf-cli

npm run build            # esbuild bundle -> dist/extension.js
npm test                 # bun test test/unit — model / engine / sidebar / card / watch / status bar / activation
npm run smoke            # build + headless check through the bundled dist
npm run typecheck        # tsc --noEmit (strict)
npm run test:integration # Tier 2 — real VS Code host. CI-only, needs a display + published faf-cli.
```

## Tier symbols

`✪ ★ ◆ ◇ ● ○ ♡` — never emoji or medals.

## License

MIT
