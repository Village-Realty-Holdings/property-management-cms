#!/usr/bin/env bash
# Local dev stack: Postgres container, the CMS (:3000) and one `next dev` per
# Site whose deploymentUrl is on localhost (read from the database).
#
# Keys: seeded Sites use apps/cms/.seed-output.json. For any other Site the
# script sets a new key on its SiteReader (creating it if missing) through
# the CMS REST API with the break-glass login, and caches it in
# $STATE_DIR/keys.json. Payload never returns a stored key, so a lost cache
# rotates it again.
#
#   dev-up.sh [up] [slug...]   start what isn't running (default: all local Sites)
#   dev-up.sh status           show what's listening
#   dev-up.sh down             stop the servers this script started
#   dev-up.sh db               only ensure Postgres is up
set -euo pipefail

ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
CMS_DIR="$ROOT/apps/cms"
SITE_DIR="$ROOT/apps/site"
SEED_OUTPUT="$CMS_DIR/.seed-output.json"
STATE_DIR="${TMPDIR:-/tmp}/property-management-dev"
PG_CONTAINER="property-management-cms-postgres-1"
PG_VOLUME="property-management-cms_postgres-data"
CMS_PORT=3000
CMS_URL="http://localhost:$CMS_PORT"
PG_DB=""
KEYS_FILE="$STATE_DIR/keys.json"

mkdir -p "$STATE_DIR"

listening() { ss -ltn "sport = :$1" | grep -q LISTEN; }

wait_http() { # url, seconds
  local i
  for ((i = 0; i < $2; i++)); do
    curl -s -o /dev/null --max-time 60 "$1" && return 0
    sleep 2
  done
  return 1
}

ensure_db() {
  if ! docker info >/dev/null 2>&1; then
    echo "docker isn't reachable: start the Docker daemon (e.g. 'sudo systemctl start docker')" >&2
    return 1
  fi
  if [[ "$(docker inspect -f '{{.State.Running}}' "$PG_CONTAINER" 2>/dev/null)" == "true" ]]; then
    :
  elif docker inspect "$PG_CONTAINER" >/dev/null 2>&1; then
    echo "starting $PG_CONTAINER"
    docker start "$PG_CONTAINER" >/dev/null
  else
    if listening 5432; then
      echo "port 5432 is taken by something else: $(ss -ltnpH 'sport = :5432' | head -1)" >&2
      return 1
    fi
    # docker-compose.yml equivalent; the compose plugin isn't installed.
    echo "creating $PG_CONTAINER"
    docker run -d --name "$PG_CONTAINER" \
      -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
      -p 5432:5432 -v "$PG_VOLUME":/var/lib/postgresql/data \
      --label com.docker.compose.project=property-management-cms \
      --label com.docker.compose.service=postgres \
      postgres:17 >/dev/null
  fi
  local i
  for ((i = 0; i < 30; i++)); do
    docker exec "$PG_CONTAINER" pg_isready -U postgres -q && { echo "postgres: ready"; return 0; }
    sleep 1
  done
  echo "postgres: not ready after 30s" >&2
  return 1
}

start() { # name, dir, port, env...
  local name=$1 dir=$2 port=$3
  shift 3
  if listening "$port"; then
    echo "$name: already listening on :$port"
    return 0
  fi
  echo "$name: starting on :$port (log $STATE_DIR/$name.log)"
  # cd on its own line so `&` backgrounds only the env→setsid exec chain and
  # $! is the new process group's leader (what `down` kills).
  (
    cd "$dir"
    env "$@" setsid nohup pnpm exec next dev --port "$port" \
      >"$STATE_DIR/$name.log" 2>&1 </dev/null &
    echo $! >"$STATE_DIR/$name.pid"
  )
}

env_value() { sed -nE "s/^$1=//p" "$CMS_DIR/.env" | tail -1 | sed -E 's/^["'"'"']|["'"'"']$//g'; }

# The database apps/cms/.env points at (DATABASE_URL's path).
pg_db() {
  [[ -n "$PG_DB" ]] || PG_DB=$(env_value DATABASE_URL | sed -E 's#.*/([^/?]+).*#\1#')
  echo "$PG_DB"
}

psql_at() { docker exec "$PG_CONTAINER" psql -U postgres -d "$(pg_db)" -Atc "$1"; }

# "slug|port" for every Site whose deploymentUrl is on localhost.
local_sites() {
  psql_at "select slug, substring(deployment_url from ':([0-9]+)') from sites
           where deployment_url ~ '^https?://(localhost|127\.0\.0\.1):[0-9]+' order by id" |
    tr '|' ' '
}

site_port() { local_sites | awk -v s="$1" '$1 == s { print $2 }'; }
site_id() { psql_at "select id from sites where slug = '$1'"; }
site_secret() { psql_at "select coalesce(revalidation_secret, '') from sites where slug = '$1'"; }

seeded_key() { # slug, readerKey
  [[ -f "$SEED_OUTPUT" ]] || return 0
  jq -r --arg s "$1" --arg k "$2" '.sites[$s][$k] // empty' "$SEED_OUTPUT"
}

cached_key() { # slug, readerKey
  [[ -f "$KEYS_FILE" ]] || return 0
  jq -r --arg s "$1" --arg k "$2" '.[$s][$k] // empty' "$KEYS_FILE"
}

# Gives the Site's SiteReader a new key and prints it. There's one reader per
# Site, so an existing one is rotated (its old key stops working) and a
# missing one is created as "<slug> (dev-up)".
# Needs the CMS up and BREAK_GLASS_* in apps/cms/.env.
mint_key() { # token, slug
  local token=$1 slug=$2 id existing key
  id=$(site_id "$slug")
  existing=$(psql_at "select id || '|' || name from site_readers where site_id = $id order by id limit 1")
  key=$(head -c 24 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=')
  if [[ -n "$existing" ]]; then
    echo "site-$slug: rotating the key of SiteReader '${existing#*|}'" >&2
    curl -sf -X PATCH -H "Authorization: JWT $token" -H 'Content-Type: application/json' \
      "$CMS_URL/api/site-readers/${existing%%|*}" \
      -d "$(jq -n --arg k "$key" '{enableAPIKey: true, apiKey: $k}')" >/dev/null ||
      { echo "could not rotate SiteReader '${existing#*|}'" >&2; return 1; }
  else
    curl -sf -X POST -H "Authorization: JWT $token" -H 'Content-Type: application/json' \
      "$CMS_URL/api/site-readers" \
      -d "$(jq -n --arg n "$slug (dev-up)" --argjson s "$id" --arg k "$key" \
        '{name: $n, site: $s, enableAPIKey: true, apiKey: $k}')" >/dev/null ||
      { echo "could not create a SiteReader for $slug" >&2; return 1; }
  fi
  echo "$key"
}

# Makes sure a non-seeded Site has a cached reader key.
ensure_keys() { # slug
  local slug=$1 token reader
  [[ -n "$(seeded_key "$slug" readerKey)" ]] && return 0
  [[ -n "$(cached_key "$slug" readerKey)" ]] && return 0
  echo "site-$slug: not seeded, minting a dev SiteReader key"
  token=$(curl -sf -X POST -H 'Content-Type: application/json' "$CMS_URL/api/users/login" \
    -d "$(jq -n --arg e "$(env_value BREAK_GLASS_EMAIL)" --arg p "$(env_value BREAK_GLASS_PASSWORD)" \
      '{email: $e, password: $p}')" | jq -r '.token // empty')
  [[ -n "$token" ]] || { echo "break-glass login failed: check BREAK_GLASS_* in apps/cms/.env" >&2; return 1; }
  reader=$(mint_key "$token" "$slug") || return 1
  [[ -f "$KEYS_FILE" ]] || echo '{}' >"$KEYS_FILE"
  jq --arg s "$slug" --arg r "$reader" '.[$s] = {readerKey: $r}' "$KEYS_FILE" >"$KEYS_FILE.tmp" &&
    mv "$KEYS_FILE.tmp" "$KEYS_FILE"
  chmod 600 "$KEYS_FILE"
}

site_key() { # slug, readerKey
  local key
  key=$(seeded_key "$1" "$2")
  [[ -n "$key" ]] || key=$(cached_key "$1" "$2")
  echo "$key"
}

cmd_up() {
  [[ -f "$CMS_DIR/.env" ]] || {
    echo "apps/cms/.env is missing (needs DATABASE_URL, PAYLOAD_SECRET, BREAK_GLASS_*, PROPERTY_FEED=fake)" >&2
    exit 1
  }
  ensure_db
  start cms "$CMS_DIR" "$CMS_PORT"

  local slugs=("$@")
  ((${#slugs[@]})) || mapfile -t slugs < <(local_sites | awk '{ print $1 }')
  ((${#slugs[@]})) || {
    echo "no Site has a localhost deploymentUrl: run 'pnpm seed' (with PROPERTY_FEED=fake), then re-run" >&2
    exit 1
  }

  local slug
  for slug in "${slugs[@]}"; do
    [[ -n "$(site_id "$slug")" ]] || { echo "unknown Site '$slug'" >&2; exit 1; }
    [[ -n "$(site_port "$slug")" ]] || {
      echo "Site '$slug' has no localhost deploymentUrl: set one (e.g. http://localhost:3202) in its Site tab" >&2
      exit 1
    }
  done

  echo "waiting for the CMS..."
  wait_http "$CMS_URL/admin" 90 || { echo "cms: no response, see $STATE_DIR/cms.log" >&2; exit 1; }

  for slug in "${slugs[@]}"; do
    ensure_keys "$slug"
    # Env vars beat apps/site/.env.local; a distDir per Site lets several
    # `next dev` run from the one app dir.
    start "site-$slug" "$SITE_DIR" "$(site_port "$slug")" \
      SITE="$slug" CONTENT_ADAPTER=rest CMS_URL="$CMS_URL" \
      CMS_READER_KEY="$(site_key "$slug" readerKey)" \
      REVALIDATION_SECRET="$(site_secret "$slug")" \
      NEXT_DIST_DIR=".next/$slug"
  done

  echo "waiting for first compile..."
  for slug in "${slugs[@]}"; do
    wait_http "http://localhost:$(site_port "$slug")/" 90 || echo "site-$slug: no response, see $STATE_DIR/site-$slug.log" >&2
  done
  cmd_status
}

cmd_status() {
  printf '%-22s %-6s %s\n' SERVICE HTTP URL
  local code url slug port
  if [[ "$(docker inspect -f '{{.State.Running}}' "$PG_CONTAINER" 2>/dev/null)" != "true" ]]; then
    printf '%-22s %-6s %s\n' postgres down "run: dev-up.sh db"
    return 0
  fi
  printf '%-22s %-6s %s\n' postgres up "localhost:5432/$(pg_db)"
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$CMS_URL/admin" || true)
  printf '%-22s %-6s %s\n' cms "${code:-down}" "$CMS_URL/admin"
  while read -r slug port; do
    url="http://localhost:$port/"
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$url" || true)
    printf '%-22s %-6s %s\n' "site-$slug" "${code:-down}" "$url"
  done < <(local_sites)
}

cmd_down() {
  local f pid i groups=()
  for f in "$STATE_DIR"/*.pid; do
    [[ -e "$f" ]] || continue
    pid=$(<"$f")
    # setsid made each server its own process group; kill the whole group.
    if kill -- "-$pid" 2>/dev/null; then
      echo "stopping $(basename "$f" .pid)"
      groups+=("$pid")
    fi
    rm -f "$f"
  done
  if ((${#groups[@]} == 0)); then
    echo "nothing started by dev-up is running"
  else
    local IFS=,
    for ((i = 0; i < 30; i++)); do
      pgrep -g "${groups[*]}" >/dev/null || break
      sleep 0.5
    done
    pgrep -g "${groups[*]}" >/dev/null && echo "some processes still shutting down (pgids ${groups[*]})" >&2
  fi
  echo "(Postgres left running; 'docker stop $PG_CONTAINER' to stop it)"
}

case "${1:-up}" in
  up) shift || true; cmd_up "$@" ;;
  status) cmd_status ;;
  down) cmd_down ;;
  db) ensure_db ;;
  *) cmd_up "$@" ;; # bare slugs: dev-up.sh demo-beach
esac
