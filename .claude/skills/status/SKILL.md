---
name: status
description: Report where this project stands — current branch, work not yet merged into `mvp`, open PRs with review and CI state, the active wave plan and how far along it is, uncommitted changes, leftover worktrees and whether the local dev stack is up. Use whenever the user asks "what's the status", "where are we", "what's left", "what's next", "catch me up", "what was I doing", or starts a session with a vague "let's continue" on this repo — even if they don't say "status".
---

# status

Run the script first. It collects every fact in one go, read-only apart from a
`git fetch`, so you don't have to piece it together from a dozen commands:

```bash
bash .claude/skills/status/scripts/status.sh
```

Then add the one thing the script can't: **how far the active plan has got.**

1. The active plan is the newest file in `docs/plans/` (the script lists them).
   Its `## Conventions` section names the wave's branch or branches.
2. Read the plan's numbered steps or tasks. Compare them with the commits on
   that branch since it left `mvp` (`git log mvp..<branch> --oneline`), and
   with any open PR for it. A step counts as done only when a commit clearly
   covers it. If you can't tell, say so rather than guessing.
3. If the plan's branch doesn't exist yet, the wave hasn't started. If it's
   already merged into `mvp` and there's no newer plan, the next step is
   writing the next plan.

## Reporting

Lead with one sentence: which wave is active and where it stands. Then give
only what the user needs to act on, most urgent first:

- Work that could be lost: uncommitted changes, branches or worktrees with
  unmerged work, a local `mvp` ahead of `origin/mvp`.
- PRs waiting on something: a review, failing checks, conflicts.
- Plan progress: steps done, the next one to do.
- Clean-up: worktrees marked "merged into mvp, safe to remove". Offer to remove
  them, but don't do it unasked.
- The dev stack only if something the user is likely to need is down.

Leave out anything that's fine and unremarkable. `pr-assets-*` branches hold PR
screenshots and are never merged, so don't list them as unmerged work.

End with a suggested next step, as a question if it needs the user's say-so.
