import path from "node:path"
import { fileURLToPath } from "node:url"

import { postgresAdapter } from "@payloadcms/db-postgres"
import { lexicalEditor } from "@payloadcms/richtext-lexical"
import { buildConfig } from "payload"

import { seedBreakGlassAdmin } from "./breakGlass"
import { collections } from "./collections"
import { Users } from "./collections/Users"
import { tenantCollections } from "./tenancy"

const dirname = path.dirname(fileURLToPath(import.meta.url))

type PayloadConfigOptions = {
  /** Postgres connection string. */
  databaseUrl: string
  /** Push schema changes straight to the database (dev and tests only). */
  push?: boolean
  /** Break-glass Super Admin created on init when there are no users. */
  breakGlass?: { email: string | undefined; password: string | undefined }
}

/**
 * Builds the Payload config. The default export uses the environment; tests
 * call this with their own throwaway database (see src/test/getTestPayload.ts).
 */
export function buildPayloadConfig({
  databaseUrl,
  push,
  breakGlass,
}: PayloadConfigOptions) {
  return buildConfig({
    admin: {
      user: Users.slug,
      importMap: {
        baseDir: path.resolve(dirname),
      },
    },
    // Copied: Payload sanitization pushes its own collections into this array.
    collections: [...collections],
    db: postgresAdapter({
      pool: { connectionString: databaseUrl },
      ...(push === undefined ? {} : { push }),
    }),
    editor: lexicalEditor(),
    // ADR-0015: no GraphQL. apps/site reads over REST.
    graphQL: { disable: true },
    secret: process.env.PAYLOAD_SECRET || "",
    typescript: {
      // Types live in packages/cms-types; the `declare module 'payload'`
      // augmentation is in src/payload-types.d.ts.
      declare: false,
      outputFile: path.resolve(
        dirname,
        "../../../packages/cms-types/src/payload-types.ts"
      ),
    },
    plugins: [
      // TODO(U1): register the multi-tenant plugin once the Sites collection
      // exists, e.g.
      //   multiTenantPlugin({ tenantsSlug: "sites", collections: tenantCollections, ... })
      // `tenantCollections` (src/tenancy.ts) is the registry of Site-scoped
      // collections.
    ],
    onInit: async (payload) => {
      if (breakGlass) await seedBreakGlassAdmin(payload, breakGlass)
    },
  })
}

// Referenced so the registry is type-checked before U1 wires the plugin in.
void tenantCollections

export default buildPayloadConfig({
  databaseUrl: process.env.DATABASE_URL || "",
  breakGlass: {
    email: process.env.BREAK_GLASS_EMAIL,
    password: process.env.BREAK_GLASS_PASSWORD,
  },
})
