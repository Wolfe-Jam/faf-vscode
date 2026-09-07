# FAF — Project Context

A human-facing HUD for your `project.faf`, inside the editor. Score, tier, and
drift at a glance; the context card rendered without leaving VS Code.

FAF is the **Foundational AI-context Format** — IANA-registered project DNA for AI.
This extension is the developer's viewport onto it. The AI's half is [`faf-mcp`](https://www.npmjs.com/package/faf-mcp).

## Status

**Phase 0 — packaging confirmation.** Proves that `faf-cli`'s scoring API runs
inside a bundled extension artifact with the WASM kernel loading cleanly. No HUD,
sidebar, status bar, or commands yet — those are Phase 1+.

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
npm run smoke     # build + headless check: scores ~/FAF/cli, asserts 100 / TROPHY
npm run typecheck # tsc --noEmit (strict)
```

## Tier symbols

`✪ ★ ◆ ◇ ● ○ ♡` — never emoji or medals.

## License

MIT
