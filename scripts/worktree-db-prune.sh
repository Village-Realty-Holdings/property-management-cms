#!/usr/bin/env bash
# Drop per-worktree databases whose worktree is gone.
#
#   scripts/worktree-db-prune.sh          # list what would be dropped
#   scripts/worktree-db-prune.sh --yes    # actually drop them
#
# Claude Code removes worktrees on its own -- on session exit, and via its
# periodic sweep -- so their databases outlive them. Rather than a teardown
# you have to remember to run first, this reconciles after the fact: any
# property_management-<slug> database with no matching worktree is orphaned.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

DB_URL="$(grep -m1 '^DATABASE_URL=' .env 2>/dev/null | cut -d= -f2- || true)"
[[ "$DB_URL" == postgres* ]] || { echo "no postgres DATABASE_URL in .env" >&2; exit 1; }

BASE="${DB_URL##*/}"; BASE="${BASE%%\?*}"      # e.g. property_management
ADMIN_URL="${DB_URL%/*}/postgres"

# Slugs that still have a worktree on disk.
LIVE="$(git worktree list --porcelain \
  | awk '/^worktree /{print $2}' \
  | while read -r p; do
      # tr -cd eats the newline too, so re-add it or the slugs run together.
      basename "$p" | tr '[:upper:] _' '[:lower:]--' | tr -cd '[:alnum:]-'; echo
    done)"

ORPHANS=()
while read -r db; do
  [[ -n "$db" ]] || continue
  slug="${db#"$BASE"-}"
  grep -qxF "$slug" <<<"$LIVE" || ORPHANS+=("$db")
done < <(psql "$ADMIN_URL" -tAc \
  "SELECT datname FROM pg_database WHERE datname LIKE '${BASE}-%'")

if [[ ${#ORPHANS[@]} -eq 0 ]]; then
  echo "no orphaned databases"
  exit 0
fi

printf 'orphaned: %s\n' "${ORPHANS[@]}"

if [[ "${1:-}" != "--yes" ]]; then
  echo
  echo "re-run with --yes to drop them"
  exit 0
fi

for db in "${ORPHANS[@]}"; do
  psql "$ADMIN_URL" -c "DROP DATABASE IF EXISTS \"$db\"" >/dev/null
  echo "dropped $db"
done
