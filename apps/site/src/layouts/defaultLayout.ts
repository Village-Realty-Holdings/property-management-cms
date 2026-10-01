import type { Payload } from "payload"

import type { Layout } from "../payload-types"

/**
 * The Site's default Layout: what `SiteFrame`'s hardcoded header and footer
 * were, as region Blocks (spec Phase 3, "Migrating the chrome"). Everything
 * it shows comes from the Brand, so a Site that has only been migrated still
 * has its name, logo, phone, address and social links around every Page.
 */
export function defaultLayoutData(): {
  name: string
  header: NonNullable<Layout["header"]>
  footer: NonNullable<Layout["footer"]>
  paths: NonNullable<Layout["paths"]>
  isDefault: true
} {
  return {
    name: "Default",
    isDefault: true,
    paths: [],
    header: [
      { blockType: "logo", size: "medium", showTagline: true },
      { blockType: "headerActions", showPhone: true },
    ],
    footer: [
      {
        blockType: "footerColumns",
        columns: [
          { heading: "Find us", content: "address" },
          { heading: "Follow us", content: "social" },
        ],
      },
      { blockType: "legalBar", text: "© {year} {name}" },
    ],
  }
}

/** What `ensureDefaultLayout` did. */
export type EnsureDefaultLayout = "created" | "exists" | "no-table"

type Queryable = {
  schemaName?: string
  pool?: {
    query: (sql: string, values: string[]) => Promise<{ rows: unknown[] }>
  }
}

/**
 * Whether the Layouts table is there yet. It isn't while `payload migrate`
 * is building the schema, or on a database nobody has migrated.
 */
async function layoutsTableExists(payload: Payload): Promise<boolean> {
  const { schemaName, pool } = payload.db as Queryable
  if (!pool) return false
  const schema = (schemaName ?? "public").replaceAll('"', '""')
  const { rows } = await pool.query(
    `SELECT to_regclass($1) IS NOT NULL AS found`,
    [`"${schema}"."layouts"`]
  )
  return (rows[0] as { found?: boolean } | undefined)?.found === true
}

/**
 * Creates the default Layout when the Site has no Layouts at all, so a Site
 * that has only been migrated shows the Brand's header and footer. A Site
 * that has any Layout is left alone, so staff who edit, replace or rename the
 * default never get it back. Safe to call any number of times, and when the
 * Layouts table does not exist yet it does nothing.
 *
 * Runs from Payload's `onInit` and from the seeds. It writes through the
 * Local API without a user: it is the Site setting itself up, not a visitor,
 * and there is no Staff User to write as.
 */
export async function ensureDefaultLayout(
  payload: Payload
): Promise<EnsureDefaultLayout> {
  if (!(await layoutsTableExists(payload))) return "no-table"
  const { totalDocs } = await payload.count({ collection: "layouts" })
  if (totalDocs > 0) return "exists"
  await payload.create({
    collection: "layouts",
    data: defaultLayoutData(),
    depth: 0,
  })
  return "created"
}
