import path from "node:path"
import { fileURLToPath } from "node:url"

import { postgresAdapter } from "@payloadcms/db-postgres"
import { buildConfig } from "payload"

import { assertNoDevSignInInProduction } from "./auth"
import { collections } from "./collections"
import { Users } from "./collections/Users"
import { pgForRuntime, siteSchema } from "./database"
import { richTextEditor } from "./fields/richText"
import { globals } from "./globals"
import { ensureDefaultLayout } from "./layouts/defaultLayout"
import { ensureRegistry, registryDb } from "./registry"
import { storagePlugins } from "./storage"
import { registerThemeFontUsage } from "./theme/record/fontUsage"

const dirname = path.dirname(fileURLToPath(import.meta.url))

type PayloadConfigOptions = {
  /** Postgres connection string. */
  databaseUrl: string
  /** Push schema changes straight to the database (dev and tests only). */
  push?: boolean
  /**
   * The Postgres schema for this Site's tables (apps/site ADR-0005).
   * Defaults to DATABASE_SCHEMA; unset or "public" means the public schema.
   */
  schemaName?: string
  /**
   * Create the default Layout on start when the Site has none (see
   * ensureDefaultLayout). On by default; tests that count Layouts turn it off.
   */
  seedDefaultLayout?: boolean
}

/** The config build in flight, if any: builds run one after another. */
let building: Promise<unknown> = Promise.resolve()

/**
 * Builds the Payload config. The default export uses the environment; tests
 * and scripts call this with their own database or schema (see
 * src/test/getTestPayload.ts, scripts/seed.ts).
 *
 * Builds never overlap. Every build prepares the same collection objects, and
 * Payload fills one in only once, at the end of the first build that meets
 * it. A second build started meanwhile (the default export's and a script's)
 * would get a collection that is not finished and fail with it, so each build
 * waits for the one before.
 */
export function buildPayloadConfig(options: PayloadConfigOptions) {
  const next = building.then(() => build(options))
  building = next.catch(() => {})
  return next
}

function build({
  databaseUrl,
  push,
  schemaName = siteSchema(),
  seedDefaultLayout = true,
}: PayloadConfigOptions) {
  // Fails startup instead of serving the dev sign-in (apps/site ADR-0003).
  assertNoDevSignInInProduction()
  // The Fonts collection refuses to delete a Font the live Theme uses.
  registerThemeFontUsage()
  return buildConfig({
    // No Payload admin UI: the Admin at /admin is our own (apps/site
    // ADR-0002). `admin.user` names the auth collection; the import map is
    // never generated because nothing renders Payload's admin.
    admin: {
      user: Users.slug,
      importMap: { autoGenerate: false },
    },
    collections: [...collections],
    db: postgresAdapter({
      pool: { connectionString: databaseUrl },
      // Drizzle refuses "public" as a schema name: leave it out for that.
      ...(schemaName && schemaName !== "public" ? { schemaName } : {}),
      pg: pgForRuntime(),
      ...(push === undefined ? {} : { push }),
    }),
    editor: richTextEditor,
    globals,
    onInit: async (payload) => {
      // Pushing the schema (dev) skips migrations, which is where the
      // Registry's tables are made (apps/site ADR-0015): make them here then.
      // Payload's own rule (db-postgres connect): it pushes outside
      // production, unless migrating or told not to.
      if (
        process.env.NODE_ENV !== "production" &&
        process.env.PAYLOAD_MIGRATING !== "true" &&
        (payload.db as { push?: boolean }).push !== false
      ) {
        await ensureRegistry(registryDb(payload))
      }
      if (!seedDefaultLayout) return
      // A Site that only migrated still needs its chrome. Starting must not
      // depend on it, so a failure is logged and the Site starts without.
      try {
        await ensureDefaultLayout(payload)
      } catch (error) {
        payload.logger.error({
          err: error,
          msg: "Could not create the default Layout",
        })
      }
    },
    // Nothing reads over GraphQL: the Site and the Admin use the Local API.
    graphQL: { disable: true },
    secret: process.env.PAYLOAD_SECRET || "",
    typescript: {
      outputFile: path.resolve(dirname, "payload-types.ts"),
    },
    plugins: [...storagePlugins()],
  })
}

export default buildPayloadConfig({
  databaseUrl: process.env.DATABASE_URL || "",
})
