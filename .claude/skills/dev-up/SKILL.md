---
name: dev-up
description: Start, check or stop this project's local dev stack — the Postgres container, the Payload CMS on :3000, and one apps/site `next dev` per Site with a localhost deployment URL (demo-mountain :3200, demo-beach :3201, pclodge :3202, or any Site added in the admin) wired to the CMS with its keys. Use whenever the user asks to run, start, boot or restart the MVP/CMS/site locally, run a specific Site, check what's running, see the admin, take screenshots of the running app, or stop the dev servers — even if they don't say "dev-up". Also use when they report "cannot connect to postgres", ECONNREFUSED on :5432, or a Site on :32xx not answering. Also use before any e2e check (next-dev-loop, agent-browser) that needs the app running.
---

# dev-up

One script does the whole thing. Run it rather than starting servers by hand: it
knows the container name, the ports, where the per-Site keys live, and the
`NEXT_DIST_DIR` trick that lets several Sites run from one app dir.

```bash
S=.claude/skills/dev-up/scripts/dev-up.sh
bash $S                 # up: Postgres + CMS + every Site with a localhost deploymentUrl
bash $S pclodge         # up, only that Site (CMS still started)
bash $S status          # Postgres state + HTTP code per service
bash $S down            # stop the servers the script started
bash $S db              # only make sure Postgres is up
```

Run it from the repo root. `up` is idempotent: anything already listening on
its port is left alone, so re-running after a crash only restarts what died.
The servers are detached (`setsid nohup`), so they outlive the command; don't
use `run_in_background` for it. The first compile takes ~20s per app; the
script waits for it and ends by printing the status table.

Logs and pid files: `${TMPDIR:-/tmp}/property-management-dev/<service>.log`.

## How it's wired (so you can debug it)

- **Postgres** is the docker container `property-management-cms-postgres-1`
  (image `postgres:17`, port 5432). The `docker compose` plugin isn't
  installed, so the script starts it with plain `docker start`/`docker run`,
  matching `docker-compose.yml`.
- **CMS** (`apps/cms`) reads `apps/cms/.env`. If that file is missing the script
  stops; it needs `DATABASE_URL`, `PAYLOAD_SECRET`, `BREAK_GLASS_EMAIL`,
  `BREAK_GLASS_PASSWORD` and `PROPERTY_FEED=fake`. The admin login is the
  `BREAK_GLASS_*` pair. It's a dotfile and gitignored, so tell the user rather
  than printing the password unless they ask.
- **Sites** (`apps/site`) come from the `sites` table of the database in
  `DATABASE_URL`: every Site whose `deploymentUrl` is `http://localhost:<port>`
  gets a `next dev` on that port. The revalidation secret comes from the same
  row. The script passes everything as env vars, which take precedence over
  `apps/site/.env.local`, and sets `NEXT_DIST_DIR=.next/<slug>`. That's needed
  because only one `next dev` can run per build dir.
- **Keys**: seeded Sites (demo-mountain, demo-beach) use the reader keys in
  `apps/cms/.seed-output.json`, written by `pnpm seed`. Payload never returns
  a stored key, so for any other Site the script logs in with the break-glass
  pair and sets a new key on that Site's SiteReader (creating it if missing),
  then caches it in `${TMPDIR:-/tmp}/property-management-dev/keys.json`.
  There's one reader per Site, so this **rotates** an existing reader's key;
  the script says which one. Tell the user when that happens, since anything else using
  the old key stops working. After a reboot clears the cache it rotates again.
- A Site with no localhost `deploymentUrl` isn't started. Set one in its Site
  tab (next free port from 3200 up) and re-run.
- No Sites at all means the DB hasn't been seeded. Run `pnpm seed` from the
  root (with `PROPERTY_FEED=fake` in `apps/cms/.env`), then run `up` again.
  Seeding is safe to re-run: it reuses the existing keys.

## When something's off

- **"cannot connect to postgres" / ECONNREFUSED :5432**: almost always the
  container stopped (a clean `Exited (0)` after a reboot or `docker stop`).
  `bash $S db` starts it. The script also says when the Docker daemon itself is
  down or when another process holds port 5432. The compose plugin isn't
  installed, so don't reach for `docker compose`.

- **Port already taken by something else**: `ss -ltnp 'sport = :3200'` shows the
  owner. A server started by hand, not by this script, won't be stopped by
  `down`. Stop it yourself (or ask the user), then run `up`.
- **Site returns 500 or has no content**: check the site's log first. The usual
  cause is the CMS not being up yet, or keys that don't match after a DB reset.
  For the second, re-seed and restart the site.
- **"Unable to acquire lock" in a site log**: another `next dev` is using the same
  `.next/<slug>` dir. Run `status`, then `down` and `up`.

## Reporting

Finish with the URLs the user can open: `/admin` on :3000, and each Site's root.
Mention where the logs are.
