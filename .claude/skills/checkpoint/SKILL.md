---
name: checkpoint
description: Close a wave of parallel work on this repo's integration branch. Merges the wave's worker PRs into `mvp`, regenerates payload-types and a Payload migration, runs typecheck/lint/test green, then creates and pushes the `mvp-cp-N` branch and `cp-N` tag, and stops for review. Use whenever the user says "checkpoint", "run the checkpoint", "cp-5", "merge the wave", "close out wave N", or asks to land a batch of worker PRs/branches (`mvp-w<N>-*`) into mvp — even if they don't use the word checkpoint.
---

# checkpoint

A checkpoint turns a wave of independent worker branches into one known-good,
tagged state that the next wave branches from. Workers own disjoint files but
never commit generated files, so the coordinator (you) does three things they
can't: merge everything, regenerate the shared generated files once, and prove
the result is green.

## Conventions in this repo

- Integration branch: `mvp`. Worker branches: `mvp-w<N>-<slug>`, each with a PR
  with base `mvp`.
- Checkpoint refs: branch `mvp-cp-N` and lightweight tag `cp-N`, both pushed.
  (Not `mvp/cp-N`: a branch named `mvp` exists, so `mvp/…` refs can't.)
- Generated files are never taken from worker branches:
  `packages/cms-types/src/payload-types.ts` and `apps/cms/src/migrations/*`.
- Migrations are named `cpN_<short_slug>`, e.g. `cp4_site_pages`. That produces
  `apps/cms/src/migrations/<timestamp>_cp4_site_pages.{ts,json}` and an entry in
  `migrations/index.ts`.
- Past checkpoints are good references: `git log --oneline cp-3..cp-4` shows
  what a finished checkpoint looks like.

## Steps

### 1. Establish N and the wave

N is the next number after the highest `cp-*` tag (`git tag -l 'cp-*' --sort=-v:refname | head -1`),
unless the user names one. The wave is the open PRs with base `mvp`:

```bash
gh pr list --base mvp --state open --json number,headRefName,title,mergeable
```

If the user named specific PRs or branches, use those. Show the list and N
before merging. If a PR looks unfinished (draft, failing, or its worker
reported `PR: none`), ask whether to include it; don't guess.

### 2. Preflight

- Working tree clean, apart from `.claude/worktrees/`, which is where worker
  worktrees live.
- `git switch mvp && git pull --ff-only origin mvp`.
- `cp-N` and `mvp-cp-N` don't already exist, locally or on origin.
- Postgres is up: `bash .claude/skills/dev-up/scripts/dev-up.sh db`.

### 3. Merge each PR

Merge one at a time, in PR order, as a merge commit:

```bash
git fetch origin
git merge --no-ff origin/<headRefName> -m "Merge <headRefName> into mvp"
```

These are local merges. Pushing `mvp` later marks the PRs merged on GitHub, so
don't also merge them with `gh`.

Expected conflicts:
- **Registry lines** (collections index, `tenancy.ts`, `payload.config.ts`
  arrays, a collection's `hooks` line). Several workers each added an entry, so
  keep all of them.
- **Generated files**: take `mvp`'s side (`git checkout --ours <file>`). Step 4
  regenerates them.
- **`pnpm-lock.yaml`**: take either side, then run `pnpm install` to rebuild it.
  Stage the result.

If a conflict needs a real design decision, not just a union, stop and ask the
user.

### 4. Regenerate

```bash
pnpm install                     # if any package.json changed
pnpm generate:types              # → packages/cms-types/src/payload-types.ts
pnpm --filter property-management-cms generate:importmap   # if admin components changed
pnpm --filter property-management-cms migrate:create cpN_<slug>
```

Look at the new migration. If it's empty, the wave had no schema change;
delete it, and say so in the report. If it drops tables or columns you didn't
expect, stop and show the user. That usually means a merge dropped a field.

### 5. Prove it's green

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Fix what fails. Integration breakages (two units' types meeting for the first
time, a missing registry entry) are the whole point of this step. Keep fixes
minimal and in scope. If a fix would change a unit's design, ask first.

When the wave touches runtime behaviour, also do a smoke run:
1. `pnpm seed`.
2. `bash .claude/skills/dev-up/scripts/dev-up.sh`.
3. Hit the pages the wave added on both demo Sites. Check each returns 200, and
   that neither Site shows the other Site's content.

### 6. Commit, tag, push

One commit on top of the merges, holding the regenerated files and any fixes:

```
chore(cp-N): <what the fixes were>; cpN migration
```

Then:

```bash
git push origin mvp
git branch mvp-cp-N && git tag cp-N
git push origin mvp-cp-N cp-N
gh pr list --base mvp --state open   # the wave's PRs should now be gone
```

### 7. Stop

Don't start the next wave. The user reviews each checkpoint first. Report:
- N and the merged PRs (numbers and titles).
- What conflicted and how each was resolved.
- The migration file, or "no schema change".
- Fixes made on top.
- Test results. Include failing output if anything is still red, and in that
  case don't create the tag at all.
- Anything left open for the next wave.
