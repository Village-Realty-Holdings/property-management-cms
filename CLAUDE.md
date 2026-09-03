# Claude Code

This project uses the Payload CMS skill at `.claude/skills/payload/`.
Start with `.claude/skills/payload/SKILL.md` for a quick reference, then see `.claude/skills/payload/reference/` for detailed docs.

# Branching and worktrees

`master` is the release branch. `dev` is the integration branch — **all work
branches off `dev` and merges back into `dev`**, never into `master` directly.
Promoting `dev` to `master` is a human decision; don't do it unasked.

Parallel work happens in worktrees, which Claude Code creates and cleans up
itself (`--worktree`, or `isolation: worktree` on a subagent). `worktree.baseRef`
is `head`, so a worktree branches from whatever is checked out — start from
`dev` so agent worktrees descend from it. `.env` is copied in automatically via
`.worktreeinclude`.

A fresh worktree still needs its port, database and dependencies. Run once,
from inside it:

```bash
scripts/worktree-setup.sh            # port, database, node_modules symlink
scripts/worktree-setup.sh --install  # real pnpm install instead of the symlink
```

It rewrites the copied `.env` to the first free port from 3001 up and to its own
`property_management-<slug>` database, then creates that database.

Worktrees are removed automatically, but their databases outlive them. Reconcile
occasionally from the main checkout:

```bash
scripts/worktree-db-prune.sh         # list orphaned databases
scripts/worktree-db-prune.sh --yes   # drop them
```

# Dependencies

**Do not edit `package.json`.** The `node_modules` symlink that makes worktrees
cheap is only valid while dependencies are unchanged, and parallel agents each
adding their own libraries produces drift. If a task genuinely needs a new
package, stop and ask.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
