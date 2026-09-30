import type { Payload } from "payload"

/**
 * Empties tables (and whatever references them) in the schema the test
 * Payload runs in: `DATABASE_SCHEMA` when it is set, otherwise `public`.
 * A bare `TRUNCATE "theme"` only finds the table in `public`.
 */
export async function truncateTables(
  payload: Payload,
  ...tables: string[]
): Promise<void> {
  const { schemaName } = payload.db as { schemaName?: string }
  const schema = schemaName ?? "public"
  const names = tables.map((table) => `${quote(schema)}.${quote(table)}`)
  await payload.db.pool.query(`TRUNCATE ${names.join(", ")} CASCADE`)
}

function quote(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`
}
