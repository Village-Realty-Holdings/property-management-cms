import path from "node:path"
import { fileURLToPath } from "node:url"

import { postgresAdapter } from "@payloadcms/db-postgres"
import { multiTenantPlugin } from "@payloadcms/plugin-multi-tenant"
import { buildConfig } from "payload"

import type { Config } from "@workspace/cms-types"

import { hasAccessToAllSites } from "./access"
import { siteSafeRichTextEditor } from "./blocks/richTextEditor"
import { seedBreakGlassAdmin } from "./breakGlass"
import { collections } from "./collections"
import { Users } from "./collections/Users"
import { pgForRuntime } from "./database"
import { storagePlugins } from "./storage"
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
      meta: {
        titleSuffix: " — Awayday CMS",
        description: "Content and Property management for Awayday Sites.",
        icons: [{ rel: "icon", type: "image/svg+xml", url: "/favicon.svg" }],
      },
      components: {
        graphics: {
          Icon: "/components/admin/Brand#Icon",
          Logo: "/components/admin/Brand#Logo",
        },
        beforeLogin: ["/components/admin/Brand#BeforeLogin"],
        afterLogin: ["/auth/LoginButton#LoginButton"],
        // The active Site, in the header of every view.
        actions: ["/components/admin/ActiveSite#ActiveSite"],
        beforeDashboard: ["/components/admin/WorkQueues#WorkQueues"],
        // DefaultNav without the active Site's turned-off Sections.
        Nav: "/components/admin/Nav#Nav",
      },
    },
    // Copied: Payload sanitization pushes its own collections into this
    // array, and plugins (multi-tenant) mutate collection configs in place.
    // Without a fresh copy per build, a second build in the same process
    // (tests, scripts) would add the `site` field twice.
    collections: collections.map(clonePlain),
    db: postgresAdapter({
      pool: { connectionString: databaseUrl },
      pg: pgForRuntime(),
      ...(push === undefined ? {} : { push }),
    }),
    // Site-safe: no pickers that could reach another Site's documents.
    editor: siteSafeRichTextEditor,
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
      ...storagePlugins(),
      // Last, so it sees every collection other plugins add.
      multiTenantPlugin<Config>({
        tenantsSlug: "sites",
        tenantField: { name: "site" },
        collections: tenantCollections,
        // Users.ts declares the Site Assignment (`tenants[].site`) itself.
        tenantsArrayField: {
          includeDefaultField: false,
          arrayFieldName: "tenants",
          arrayTenantFieldName: "site",
        },
        userHasAccessToAllTenants: hasAccessToAllSites,
        i18n: {
          translations: {
            en: {
              "nav-tenantSelector-label": "Site",
              "field-assignedTenant-label": "Site",
              "assign-tenant-button-label": "Assign Site",
            },
          },
        },
      }),
    ],
    onInit: async (payload) => {
      if (breakGlass) await seedBreakGlassAdmin(payload, breakGlass)
    },
  })
}

/**
 * Deep-copies plain objects and arrays; functions, class instances and other
 * values are shared. Enough to isolate plugin mutations between builds.
 */
function clonePlain<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clonePlain) as T
  if (
    value !== null &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, clonePlain(entry)])
    ) as T
  }
  return value
}

export default buildPayloadConfig({
  databaseUrl: process.env.DATABASE_URL || "",
  breakGlass: {
    email: process.env.BREAK_GLASS_EMAIL,
    password: process.env.BREAK_GLASS_PASSWORD,
  },
})
