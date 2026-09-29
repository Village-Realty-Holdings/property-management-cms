#!/usr/bin/env bash
# Facts for "where is this project?": branch, unmerged work, PRs, plans,
# local changes, worktrees and the dev stack. Read-only; runs `git fetch`.
set -uo pipefail

ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$ROOT" || exit 1
INTEGRATION=mvp

section() { printf '\n## %s\n' "$1"; }

git fetch -q --prune origin 2>/dev/null || echo "(git fetch failed: remote state may be stale)"

section "Branch"
git status -sb | head -1
git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1 || echo "(no upstream: this branch isn't pushed)"
echo "last commit: $(git log -1 --format='%h %ad %s' --date=short)"
echo "$INTEGRATION vs origin/$INTEGRATION: $(git rev-list --left-right --count "$INTEGRATION...origin/$INTEGRATION" 2>/dev/null | awk '{print $1" ahead, "$2" behind"}')"
echo "main is $(git rev-list --count "origin/main..$INTEGRATION" 2>/dev/null) commits behind $INTEGRATION"

section "Branches with work not in $INTEGRATION"
found=0
while read -r ref; do
  [[ "$ref" =~ (^|/)(main|HEAD|$INTEGRATION)$ || "$ref" == "origin" ]] && continue
  n=$(git rev-list --count "$INTEGRATION..$ref" 2>/dev/null) || continue
  ((n > 0)) || continue
  note=""
  [[ "$ref" == *pr-assets-* ]] && note="  (PR screenshots only, never merged)"
  echo "$ref: $n commit(s), last $(git log -1 --format='%ad %s' --date=short "$ref")$note"
  found=1
done < <(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin)
((found)) || echo "none"

section "Open PRs"
if command -v gh >/dev/null; then
  gh pr list --state open --json number,title,headRefName,baseRefName,reviewDecision,statusCheckRollup \
    --jq '.[] | "#\(.number) \(.title) [\(.headRefName) → \(.baseRefName)] review: \(.reviewDecision // "none") checks: \([.statusCheckRollup[]? | (.conclusion // .status // empty)] | if length == 0 then "none" else (group_by(.) | map("\(.[0])×\(length)") | join(" ")) end)"' 2>/dev/null ||
    echo "(gh failed: not logged in or no network)"
  [[ -n "$(gh pr list --state open --json number --jq '.[]' 2>/dev/null)" ]] || echo "none"
else
  echo "(gh not installed)"
fi

section "Plans (newest first)"
ls -t apps/*/docs/plans/*.md 2>/dev/null | head -3 | while read -r f; do
  echo "$f: $(head -1 "$f" | sed 's/^# //'), last changed $(git log -1 --format=%ad --date=short -- "$f" 2>/dev/null)"
done

section "Uncommitted"
changes=$(git status --short | grep -v '^?? .claude/worktrees/$')
[[ -n "$changes" ]] && echo "$changes" || echo "clean"

section "Worktrees"
wt=$(git worktree list | tail -n +2)
if [[ -n "$wt" ]]; then
  while read -r path _ branch; do
    b=${branch//[\[\]]/}
    merged=$(git merge-base --is-ancestor "$b" "$INTEGRATION" 2>/dev/null && echo "merged into $INTEGRATION, safe to remove" || echo "has unmerged work")
    echo "$b ($merged): $path"
  done <<<"$wt"
else
  echo "none"
fi

section "Dev stack"
DEV_UP=.claude/skills/dev-up/scripts/dev-up.sh
[[ -x "$DEV_UP" || -f "$DEV_UP" ]] && bash "$DEV_UP" status 2>&1 || echo "(no dev-up script)"
