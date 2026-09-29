import path from "node:path"
import { fileURLToPath } from "node:url"

import { postgresAdapter } from "@payloadcms/db-postgres"
import { lexicalEditor } from "@payloadcms/richtext-lexical"
import { buildConfig } from "payload"

import { collections } from "./collections"
import { Users } from "./collections/Users"
import { pgForRuntime } from "./database"
import { storagePlugins } from "./storage"

const dirname = path.dirname(fileURLToPath(import.meta.url))

type PayloadConfigOptions = {
  /** Postgres connection string. */
  databaseUrl: string
  /** Push schema changes straight to the database (dev and tests only). */
  push?: boolean
}

/**
 * Builds the Payload config. The default export uses the environment; tests
 * call this with their own throwaway database (see src/test/getTestPayload.ts).
 */
export function buildPayloadConfig({
  databaseUrl,
  push,
}: PayloadConfigOptions) {
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
    },
    collections: [...collections],
    db: postgresAdapter({
      pool: { connectionString: databaseUrl },
      pg: pgForRuntime(),
      ...(push === undefined ? {} : { push }),
    }),
    editor: lexicalEditor(),
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
