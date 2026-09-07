# Watch the score climb

Every save re-scores `project.faf` in-process. Two places track it live:

- **Status bar** — tier glyph + score (`✪ FAF 100%`). Hover for the gap to the
  next tier and the populated-slot count. Click to open the context card.
- **FAF Context sidebar** — the score header, the 21 scored slots folded into
  Project / Human Context / Stack, and a **Drift** group showing whether
  `CLAUDE.md`, `AGENTS.md`, `.cursorrules` and `GEMINI.md` are in step.

Tiers: `♡ ○ ● ◇ ◆ ★ ✪` — White to Trophy. **FAF: Sync Context Files** writes the
AI-context files back from `project.faf` when they drift.
