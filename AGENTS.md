## Agent skills

### Issue tracker

Issues live as GitHub issues, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Frontend design taste

`.claude/skills/` vendors the [taste-skill](https://github.com/Leonxlnx/taste-skill) skill set (MIT-licensed) for UI/redesign work: `taste-skill` (general anti-slop frontend + Section 11's redesign protocol), plus `brutalist-skill`, `gpt-tasteskill`, `image-to-code-skill`, `brandkit`. Most of it targets landing pages/portfolios, which this app is not — pull only what applies (typography, color, spacing, interactive-state completeness; skip hero/CTA/bento-grid rules). See `.claude/skills/llms.txt` for the full index.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
