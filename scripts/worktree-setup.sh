#!/usr/bin/env bash
# Prepare a fresh worktree for development. Run once, from inside it.
#
#   scripts/worktree-setup.sh [--install]
#
# Claude Code creates the worktree and copies .env in via .worktreeinclude.
# This handles only the parts it leaves to the project: a port and database
# of our own, so parallel worktrees don't collide, plus dependencies.

set -euo pipefail

DIR="$(git rev-parse --show-toplevel)"
cd "$DIR"

MAIN="$(git rev-parse --path-format=absolute --git-common-dir)"
MAIN="$(dirname "$MAIN")"

if [[ "$MAIN" == "$DIR" ]]; then
  echo "This is the main checkout, not a worktree. Nothing to do." >&2
  exit 1
fi

SLUG="$(basename "$DIR" | tr '[:upper:] _' '[:lower:]--' | tr -cd '[:alnum:]-')"

# First free port from 3001 up; 3000 belongs to the main checkout.
PORT=3001
while ss -ltn "( sport = :$PORT )" 2>/dev/null | grep -q LISTEN; do
  PORT=$((PORT + 1))
done

if [[ ! -f .env ]]; then
  echo "no .env here -- is '.env' listed in .worktreeinclude?" >&2
  exit 1
fi

# .env arrives verbatim, so it still points at port 3000 and the main
# database. Repoint both at ours.
sed -i -E \
  -e "s#^(DATABASE_URL=.*/[A-Za-z0-9_-]+)(\?.*)?\$#\1-${SLUG}\2#" \
  -e "s#^(NEXT_PUBLIC_SERVER_URL=).*\$#\1http://localhost:${PORT}#" \
  .env
grep -q '^PORT=' .env || echo "PORT=${PORT}" >> .env

# Postgres won't create the database on demand. Payload pushes the schema
# into it on first boot.
DB_URL="$(grep -m1 '^DATABASE_URL=' .env | cut -d= -f2-)"
if [[ "$DB_URL" == postgres* ]]; then
  DB_NAME="${DB_URL##*/}"; DB_NAME="${DB_NAME%%\?*}"
  ADMIN_URL="${DB_URL%/*}/postgres"
  if psql "$ADMIN_URL" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null | grep -q 1; then
    echo "database $DB_NAME already exists"
  elif psql "$ADMIN_URL" -c "CREATE DATABASE \"$DB_NAME\"" >/dev/null 2>&1; then
    echo "created database $DB_NAME"
  else
    echo "warning: could not create database $DB_NAME -- create it before pnpm dev" >&2
  fi
fi

if [[ "${1:-}" == "--install" ]]; then
  pnpm install --ignore-workspace
elif [[ -d "$MAIN/node_modules" && ! -e node_modules ]]; then
  # Share the main checkout's install. Fast, and correct while package.json
  # is unchanged -- which the locked dependency policy guarantees.
  ln -s "$MAIN/node_modules" node_modules
fi

echo
echo "  ready: pnpm dev --port $PORT"
