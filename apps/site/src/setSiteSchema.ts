import { sql } from "@payloadcms/db-postgres"
import type { MigrateUpArgs } from "@payloadcms/db-postgres"

/**
 * Called first in every migration's up() and down() (added by
 * scripts/genericize-migration.ts, apps/site ADR-0005). It creates this
 * Site's schema if it is missing, then points the rest of the migration's
 * transaction at it, so the unqualified CREATE TYPE and CREATE TABLE
 * statements land there and nowhere else.
 *
 * `SET LOCAL` lasts to the end of the transaction Payload wraps each
 * migration in. The schema name comes from the adapter (DATABASE_SCHEMA),
 * else "public".
 *
 * This file lives outside src/migrations because Payload treats every file
 * in that folder as a migration.
 */
export async function setSiteSchema(
  db: MigrateUpArgs["db"],
  payload: MigrateUpArgs["payload"]
): Promise<void> {
  const schema = (payload.db as { schemaName?: string }).schemaName || "public"
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(schema)}`)
  await db.execute(sql`SET LOCAL search_path TO ${sql.identifier(schema)}`)
}
