# FAF — Project Context

A human-facing HUD for your `project.faf`, inside the editor. Score, tier, and
drift at a glance; the context card rendered without leaving VS Code.

FAF is the **Foundational AI-context Format** — IANA-registered project DNA for AI.
This extension is the developer's viewport onto it. The AI's half is [`faf-mcp`](https://www.npmjs.com/package/faf-mcp).

## Status

**Phase 1 — status bar.** Scores the workspace `project.faf` on activation and
shows the tier glyph + score in the status bar (`✪ FAF 100%`), with a tooltip
carrying the tier, the gap to the next tier, and the populated-slot count. One
command: **FAF: Refresh Score**. Sidebar, context card, drift, and watch land in
Phase 2+.

## How it works

- One runtime dependency: [`faf-cli`](https://www.npmjs.com/package/faf-cli),
  bundled by esbuild into `dist/extension.js`.
- The scoring kernel (`faf-scoring-kernel`, Rust to WASM) stays external so its
  synchronous `__dirname` + `readFileSync` load resolves against real
  `node_modules`.
- Scoring, tiers, slots, and the context card are 100% imported from `faf-cli` —
  the extension re-derives none of it.

## Develop

```bash
npm install
npm run build     # esbuild bundle -> dist/extension.js
npm test          # bun test — pure model + engine parity + status bar + activation
npm run smoke     # build + headless check: scores ~/FAF/cli, asserts ✪ FAF 100%
npm run typecheck # tsc --noEmit (strict)
```

## Tier symbols

`✪ ★ ◆ ◇ ● ○ ♡` — never emoji or medals.

## License

MIT
