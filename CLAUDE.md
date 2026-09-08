# Claude Code

This project uses the Payload CMS skill at `.claude/skills/payload/`.
Start with `.claude/skills/payload/SKILL.md` for a quick reference, then see `.claude/skills/payload/reference/` for detailed docs.

# Branching

`master` is the release branch. `dev` is the integration branch — **all work
branches off `dev` and merges back into `dev`**, never into `master` directly.
Promoting `dev` to `master` is a human decision; don't do it unasked.

Parallel work happens in git worktrees. How they are set up is personal
workflow rather than project configuration, so it isn't tracked here — see the
`worktrees` skill. Start worktrees from `dev` so they descend from it.

# Ownership zones

Agents own a zone, so parallel work doesn't collide on the same files. See
`.claude/agents/` for the two role definitions.

| Zone | Paths |
|---|---|
| Backend | `src/collections/` `src/access/` `src/fields/` `src/endpoints/` `src/plugins/` `src/search/` `src/server/` `src/payload.config.ts` |
| UI | `src/components/` `src/heros/` `src/Header/` `src/Footer/` `src/providers/` `src/app/(frontend)/` |
| Shared | `src/lib/` `src/seo/` `src/app/(payload)/` `src/payload-types.ts` |

`src/blocks/` and `src/heros/` straddle the line. The rule is **`config.ts` is
backend, `Component.tsx` is UI** — same folder, different owners, no conflict.

Reading data is not a boundary violation: server components under
`src/app/(frontend)/` import `@payload-config`, and `@/server/*` exists for
cached reads. Importing collection or access *config* into a component is the
violation, and `no-restricted-imports` in `eslint.config.mjs` enforces it.

`src/payload-types.ts` is generated. Run `npm run generate:types` rather than
resolving conflicts in it by hand; `.gitattributes` marks it generated.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
