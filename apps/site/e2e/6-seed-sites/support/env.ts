/* eslint-disable turbo/no-undeclared-env-vars -- E2E_* switches of the acceptance tests, which are not turbo tasks */
import { createHash } from "node:crypto"
import { homedir } from "node:os"
import path from "node:path"

import { APP_DIR, databaseUrl } from "../../theme/support/env"

/**
 * Where the Phase 6 acceptance tests (the three seeded Sites) run.
 *
 * Next.js allows one `next dev` per app directory, and the Theme suite's
 * global setup already runs one from this checkout. So, as the spec has it,
 * each Site runs from its own worktree: the tests make three scratch
 * worktrees of this checkout (HEAD plus uncommitted changes, so a coder can
 * run them before committing), install them, and give each the Site's env
 * file with the scratch database. The Site's own worktrees
 * (`pnpm sites:worktrees`, ../pm-<slug>) are checked by 3-worktrees.e2e.ts
 * but never run or written to here: they may hold a real Site's media.
 *
 * - Database: `DATABASE_URL`, which must name a scratch `pm_*` database
 *   (apps/site/.env or the shell; see e2e/theme/support/env.ts).
 *   `property_management_site` is refused.
 * - Schemas: each Site's own (`warren_beach`, `avada`, `beachside`), in that
 *   scratch database, because a Site's fixtures are keyed by its schema.
 *   They are dropped when a spec file ends unless `E2E_KEEP_SCHEMA=1`. Only
 *   one run of this suite per database at a time.
 * - Ports: `E2E_SITES_PORT` and the next two (3601–3603 by default), so the
 *   Sites' own ports (3001–3003) stay free for real local runs.
 * - Worktrees: `E2E_WORKTREES_DIR/<slug>` (by default under
 *   ~/.cache/pm-site-e2e, on the same disk as the pnpm store). Removed when a
 *   spec file ends unless `E2E_KEEP_WORKTREES=1`.
 * - Network: the seeds import Google Fonts, so the machine must reach Google.
 * - Brand reference screenshots: read with `git show` from
 *   `E2E_BRAND_REF`, else `research/brand-extraction` or its origin copy.
 */

export { APP_DIR, databaseUrl }

export const REPO_ROOT = path.resolve(APP_DIR, "..", "..")

export const PORT_BASE = Number(process.env.E2E_SITES_PORT ?? 3601)

export const WORKTREES_DIR =
  process.env.E2E_WORKTREES_DIR ??
  path.join(
    homedir(),
    ".cache",
    "pm-site-e2e",
    createHash("sha256").update(REPO_ROOT).digest("hex").slice(0, 12)
  )

export const KEEP_SCHEMA = process.env.E2E_KEEP_SCHEMA === "1"
export const KEEP_WORKTREES = process.env.E2E_KEEP_WORKTREES === "1"

/** Where this suite writes its screenshots (the pairs for the PR). */
export const SCREENSHOT_DIR = path.join(
  APP_DIR,
  "docs",
  "screenshots",
  "6-seed-sites"
)

export const BRAND_REFS = process.env.E2E_BRAND_REF
  ? [process.env.E2E_BRAND_REF]
  : ["research/brand-extraction", "origin/research/brand-extraction"]

/** The integration branch the Sites' worktrees follow. */
export const SITES_BRANCH = "milestone/site-builder"
