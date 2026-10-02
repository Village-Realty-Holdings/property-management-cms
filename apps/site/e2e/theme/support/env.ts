/* eslint-disable turbo/no-undeclared-env-vars -- E2E_* switches of the acceptance tests, which are not turbo tasks */
import { fileURLToPath } from "node:url"

import { config } from "dotenv"

/**
 * Where the Theme acceptance tests run. They start the real Site in dev mode
 * against a scratch schema of a scratch database, never a Site's own.
 *
 * - Database: `DATABASE_URL` (apps/site/.env or the shell), which must name a
 *   `pm_*` database. `property_management_site` is refused.
 * - Schema: `ms_2_theme_rendering`, created by the migration and dropped when
 *   the run ends. (Underscores only: apps/site/src/database.ts rejects a `-`.)
 * - Port: `E2E_PORT`, 3101 by default.
 */

config({
  quiet: true,
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
})

export const APP_DIR = fileURLToPath(new URL("../../../", import.meta.url))

export const SCHEMA = process.env.E2E_SCHEMA ?? "ms_2_theme_rendering"
// Modules of the Site read the schema from the environment when they load
// (where Fonts are stored: media/<schema>/fonts), so import this file first.
process.env.DATABASE_SCHEMA = SCHEMA
export const PORT = Number(process.env.E2E_PORT ?? 3101)
export const ORIGIN = `http://localhost:${PORT}`
export const PAYLOAD_SECRET = "e2e-theme-rendering-secret"
// Specs that open Payload in the test process (openScratchSite) need a secret
// too, whether or not the machine has a .env with one.
process.env.PAYLOAD_SECRET ??= PAYLOAD_SECRET

/** Where the screenshots of this run are written (the Phase 2 review set). */
export const SCREENSHOT_DIR = fileURLToPath(
  new URL("../../../docs/screenshots/2-theme/", import.meta.url)
)

export function databaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      "DATABASE_URL must point at a scratch Postgres database (pm_milestone) to run the Theme acceptance tests."
    )
  }
  const name = new URL(url).pathname.replace(/^\//, "")
  if (!/^pm_/.test(name)) {
    throw new Error(
      `Refusing to run against database "${name}": the Theme acceptance tests only use a scratch pm_* database (e.g. pm_milestone).`
    )
  }
  return url
}

/** The environment the Site's dev server and `payload migrate` run in. */
export function siteEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    // Vitest sets "test"; the dev server (and its demo route) is "development".
    NODE_ENV: "development",
    DATABASE_URL: databaseUrl(),
    DATABASE_SCHEMA: SCHEMA,
    PAYLOAD_SECRET,
    DEV_SIGN_IN: "1",
    SITE_URL: ORIGIN,
    // Sign in with Microsoft is off, so the screens look the same on every
    // machine whether or not its .env has an Entra app (the baselines have
    // only the dev sign-in button).
    ENTRA_TENANT_ID: "",
    ENTRA_CLIENT_ID: "",
    ENTRA_CLIENT_SECRET: "",
    // No Workflows platform: the Guest feedback survey's feedback can't be passed on,
    // whatever the machine's .env says.
    WORKFLOWS_URL: "",
    PORT: String(PORT),
    NEXT_TELEMETRY_DISABLED: "1",
  }
}
