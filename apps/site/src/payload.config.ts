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
}

/**
 * Builds the Payload config. The default export uses the environment; tests
 * call this with their own throwaway database (see src/test/getTestPayload.ts).
 */
export function buildPayloadConfig({
  databaseUrl,
  push,
  schemaName = siteSchema(),
}: PayloadConfigOptions) {
  // Fails startup instead of serving the dev sign-in (apps/site ADR-0003).
  assertNoDevSignInInProduction()
  // The Fonts collection refuses to delete a Font the live Theme uses.
  registerThemeFontUsage()
  return buildConfig({
    // Payload's own admin, kept as a reference while the Admin at /admin is
    // built (apps/site ADR-0002).
    routes: { admin: "/p-admin" },
    admin: {
      user: Users.slug,
      importMap: {
        baseDir: path.resolve(dirname),
      },
      meta: {
        titleSuffix: " — Payload admin",
      },
      components: {
        afterLogin: ["/auth/PayloadAdminSignIn#PayloadAdminSignIn"],
        logout: { Button: "/auth/PayloadAdminSignIn#PayloadAdminSignOut" },
      },
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
