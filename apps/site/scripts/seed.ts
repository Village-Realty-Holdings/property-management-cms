/**
 * Seeds one Site (apps/site ADR-0005):
 *
 *   pnpm site warren-beach seed
 *
 * It creates the Site's schema and migrates it (the one schema-agnostic
 * migration creates the schema when it is missing), then runs the Site's seed
 * module, src/seed/<DATABASE_SCHEMA>.ts, as the seed User through the
 * Local API. Every step looks a record up by its natural key and writes only
 * what differs, so a second run changes nothing (src/seed/upsert.ts).
 *
 * It never touches the property_management_site database, and never seeds the
 * public schema. A scratch schema named ms_<something> has no seed of its own:
 * SEED_SITE=avada borrows the seed of a Site for it, for testing.
 */
import { pathToFileURL } from "node:url"

import { siteSchema } from "../src/database"
import { SEED_MODULES } from "../src/seed"

/** The database Sites in production use: a seed must never run against it. */
const PROTECTED_DATABASE = "property_management_site"

export type SeedTarget = {
  databaseUrl: string
  database: string
  schema: string
  /** The Site whose seed module runs: the schema's own, unless borrowed. */
  site: string
}

const SITES = Object.keys(SEED_MODULES).join(", ")

export function resolveSeedTarget(
  env: Record<string, string | undefined>
): SeedTarget {
  const databaseUrl = env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Point it at a Postgres database (pnpm site <slug> seed reads it from apps/site/.env.<slug>)."
    )
  }
  const database = new URL(databaseUrl).pathname.replace(/^\//, "")
  if (database === PROTECTED_DATABASE) {
    throw new Error(
      `Refusing to seed the ${PROTECTED_DATABASE} database. Use a scratch database (for example pm_milestone) or the Sites' own (property_management_sites).`
    )
  }

  const schema = siteSchema(env)
  if (!schema || schema === "public") {
    throw new Error(
      `DATABASE_SCHEMA must name the Site's schema (${SITES}), not the public schema.`
    )
  }

  const borrowed = env.SEED_SITE?.trim()
  if (borrowed) {
    if (!schema.startsWith("ms_")) {
      throw new Error(
        `SEED_SITE only applies to a scratch schema named ms_<something>, not "${schema}". A Site's schema runs its own seed.`
      )
    }
    if (!(borrowed in SEED_MODULES)) {
      throw new Error(
        `SEED_SITE=${borrowed} has no seed. Seeds exist for: ${SITES}.`
      )
    }
    return { databaseUrl, database, schema, site: borrowed }
  }
  if (!(schema in SEED_MODULES)) {
    throw new Error(
      `There is no seed for DATABASE_SCHEMA "${schema}". Seeds exist for: ${SITES}. (A scratch ms_ schema can borrow one with SEED_SITE=<schema>.)`
    )
  }
  return { databaseUrl, database, schema, site: schema }
}

async function main() {
  let target: SeedTarget
  try {
    target = resolveSeedTarget(process.env)
  } catch (error) {
    console.error((error as Error).message)
    process.exit(2)
  }

  const { getPayload } = await import("payload")
  const { buildPayloadConfig } = await import("../src/payload.config")
  const { migrations } = await import("../src/migrations")
  const { runSeed, seedModuleFor } = await import("../src/seed")

  console.log(`Seeding ${target.site} into schema ${target.schema}`)
  // No push: the migration is what builds the schema (and creates it).
  const payload = await getPayload({
    config: buildPayloadConfig({
      databaseUrl: target.databaseUrl,
      schemaName: target.schema,
      push: false,
    }),
  })
  try {
    // The generated migrations type their arguments; Payload's Migration
    // type takes `unknown`.
    await payload.db.migrate({ migrations: migrations as never })
    const report = await runSeed(payload, {
      module: seedModuleFor(target.site),
    })
    for (const { kind, key, action } of report) {
      console.log(`  ${action.padEnd(9)} ${kind} ${key}`)
    }
    const written = report.filter((entry) => entry.action !== "unchanged")
    console.log(
      written.length === 0
        ? "Nothing to change: already seeded."
        : `Seeded ${written.length} of ${report.length} records.`
    )
  } finally {
    await payload.destroy()
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().then(
    () => process.exit(0),
    (error: unknown) => {
      console.error(error)
      process.exit(1)
    }
  )
}
