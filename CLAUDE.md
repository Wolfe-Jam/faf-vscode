<!-- faf:start -->
<!-- faf: faf-context | TypeScript | library | Show where your project.faf stands — score, tier, drift — and render its context card, without leaving the editor. -->
<!-- faf: claim=project.faf | family=FAF -->

# CLAUDE.md — faf-context

## What This Is

Show where your project.faf stands — score, tier, drift — and render its context card, without leaving the editor.

## Stack

- **Language:** TypeScript
- **Hosting:** VS Code Marketplace + Open VSX
- **Build:** esbuild
- **CI/CD:** GitHub Actions

## Context

- **Who:** Developers using AI coding assistants who keep a project.faf and want its score, tier, and drift visible in the editor.
- **What:** Show where your project.faf stands — score, tier, drift — and render its context card, without leaving the editor.
- **Why:** So the state of project.faf is a one-glance editor concern instead of a terminal round-trip — the human half of FAF context, paired with faf-mcp's AI half.
- **Where:** https://github.com/Wolfe-Jam/faf-vscode
- **When:** Shipped 2026-09-08. Live on the VS Code Marketplace and Open VSX as faf.faf-context. Status bar + sidebar HUD + context card, the version-locked FAF CLI runner, FAF Init/Sync/DNA commands, the getting-started walkthrough, CodeLens on project.faf, path-aware slot navigation, and Workspace Trust gating.
- **How:** esbuild bundles faf-cli's library for in-process scoring; the shipped faf-cli/dist/cli.js runs on VS Code's own Node for Init/Sync/DNA. bun test for Tier 1, real extension host for Tier 2 (CI).

---

*STATUS: BI-SYNC ACTIVE — 2026-09-08T14:15:22.018Z*
<!-- faf:end -->
