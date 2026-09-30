import { execFile } from "node:child_process"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import pg from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { findPublicQualifiers } from "../scripts/check-migrations"
import { migrations } from "./migrations"
import {
  createTestDatabase,
  getTestPayload,
  type TestDatabase,
  type TestPayload,
} from "./test/getTestPayload"

/**
 * Phase 1 acceptance (apps/site ADR-0005): three Sites share one database,
 * each in its own schema, all made by the one schema-agnostic migration
 * running from zero with `payload migrate`.
 *
 * It needs a Postgres server (DATABASE_URL); it creates a throwaway
 * `pm_test_*` database on it and drops it afterwards.
 */
const SITES = {
  warrenBeach: "ms_1_migrations_warren_beach",
  avada: "ms_1_migrations_avada",
  beachside: "ms_1_migrations_beachside",
} as const
const ALL_SCHEMAS = Object.values(SITES)

const appDir = fileURLToPath(new URL("..", import.meta.url))
const migrationsDir = fileURLToPath(new URL("./migrations", import.meta.url))

const hasDatabase = Boolean(process.env.DATABASE_URL)
if (!hasDatabase) {
  console.warn(
    "migrations.acceptance.test.ts skipped: DATABASE_URL is not set. Point it at a Postgres server (docker compose up -d postgres) to run the three-schema acceptance test."
  )
}

/** What the migration builds, read from its snapshot: table and enum names. */
function snapshotContents() {
  const file = migrations.at(-1)!.name
  const snapshot = JSON.parse(
    readFileSync(`${migrationsDir}/${file}.json`, "utf8")
  ) as {
    tables: Record<string, unknown>
    enums: Record<string, unknown>
  }
  const bare = (key: string) => key.replace(/^public\./, "")
  return {
    tables: Object.keys(snapshot.tables).map(bare).sort(),
    enums: Object.keys(snapshot.enums).map(bare).sort(),
  }
}

describe.skipIf(!hasDatabase)("three Sites migrating from zero", () => {
  let database: TestDatabase
  let sql: pg.Client
  const sites: Partial<Record<keyof typeof SITES, TestPayload>> = {}
  const expected = snapshotContents()

  /** `pnpm site <slug> migrate` without the slug: `payload migrate` for one schema. */
  async function migrate(schema: string) {
    await promisify(execFile)("pnpm", ["exec", "payload", "migrate"], {
      cwd: appDir,
      env: {
        ...process.env,
        DATABASE_URL: database.url,
        DATABASE_SCHEMA: schema,
      },
    })
  }

  const tablesIn = async (schema: string) =>
    (
      await sql.query<{ table_name: string }>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY 1",
        [schema]
      )
    ).rows.map((row) => row.table_name)

  const enumsIn = async (schema: string) =>
    (
      await sql.query<{ typname: string }>(
        `SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
         WHERE n.nspname = $1 AND t.typtype = 'e' ORDER BY 1`,
        [schema]
      )
    ).rows.map((row) => row.typname)

  const schemaExists = async (schema: string) =>
    (await sql.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [schema]))
      .rowCount === 1

  const migrationRows = async (schema: string) =>
    (
      await sql.query<{ name: string; batch: number }>(
        `SELECT name, batch FROM "${schema}"."payload_migrations" ORDER BY id`
      )
    ).rows

  const home = (title: string) => ({
    title,
    path: "/",
    _status: "published" as const,
    layout: [{ blockType: "hero" as const, heading: title }],
  })

  const payloadOf = (site: keyof typeof SITES) => sites[site]!.payload

  beforeAll(async () => {
    database = await createTestDatabase()
    sql = new pg.Client({ connectionString: database.url })
    await sql.connect()
    // push: false leaves the database empty: only `payload migrate` builds it.
    for (const [site, schemaName] of Object.entries(SITES)) {
      sites[site as keyof typeof SITES] = await getTestPayload({
        database,
        schemaName,
        push: false,
      })
    }
  }, 120_000)

  afterAll(async () => {
    for (const site of Object.values(sites)) await site?.teardown()
    await sql?.end()
    await database?.drop()
  })

  it("has no schema for any Site before its migration runs", async () => {
    for (const schema of ALL_SCHEMAS) {
      expect(await schemaExists(schema)).toBe(false)
    }
  })

  it("creates each Site's schema by migrating alone, with the full table set", async () => {
    expect(expected.tables.length).toBeGreaterThan(10)

    // Sites deploy separately, so migrating them at once is realistic too.
    await Promise.all(ALL_SCHEMAS.map(migrate))

    for (const schema of ALL_SCHEMAS) {
      expect(await schemaExists(schema)).toBe(true)
      expect(await tablesIn(schema)).toEqual(expected.tables)
      expect(await enumsIn(schema)).toEqual(expected.enums)
    }
  }, 120_000)

  it("leaves the public schema without a single one of them", async () => {
    expect(await tablesIn("public")).toEqual([])
    expect(await enumsIn("public")).toEqual([])
  })

  it("records the migration once in each Site's own schema", async () => {
    for (const schema of ALL_SCHEMAS) {
      expect((await migrationRows(schema)).map((row) => row.name)).toEqual(
        migrations.map((m) => m.name)
      )
    }
  })

  it("is a no-op when run a second time", async () => {
    const before = await Promise.all(ALL_SCHEMAS.map(migrationRows))

    await Promise.all(ALL_SCHEMAS.map(migrate))

    expect(await Promise.all(ALL_SCHEMAS.map(migrationRows))).toEqual(before)
    for (const schema of ALL_SCHEMAS) {
      expect(await tablesIn(schema)).toEqual(expected.tables)
    }
    expect(await tablesIn("public")).toEqual([])
  }, 120_000)

  it("shows a row written in one Site to that Site only", async () => {
    await payloadOf("warrenBeach").create({
      collection: "pages",
      data: home("Warren Beach home"),
    })

    const titlesSeenBy = async (site: keyof typeof SITES) =>
      (await payloadOf(site).find({ collection: "pages" })).docs.map(
        (page) => page.title
      )

    expect(await titlesSeenBy("warrenBeach")).toEqual(["Warren Beach home"])
    expect(await titlesSeenBy("avada")).toEqual([])
    expect(await titlesSeenBy("beachside")).toEqual([])

    await payloadOf("avada").create({
      collection: "pages",
      data: home("Avada home"),
    })
    await payloadOf("beachside").create({
      collection: "pages",
      data: home("Beachside home"),
    })

    expect(await titlesSeenBy("warrenBeach")).toEqual(["Warren Beach home"])
    expect(await titlesSeenBy("avada")).toEqual(["Avada home"])
    expect(await titlesSeenBy("beachside")).toEqual(["Beachside home"])
  })

  it("allows the same path in every Site, since each schema has its own constraints", async () => {
    for (const schema of ALL_SCHEMAS) {
      const { rows } = await sql.query<{ n: string }>(
        `SELECT count(*) AS n FROM "${schema}"."pages" WHERE path = '/'`
      )
      expect(Number(rows[0]!.n)).toBe(1)
    }
  })

  it("reports the schema each Payload runs in", () => {
    for (const [site, schema] of Object.entries(SITES)) {
      expect(payloadOf(site as keyof typeof SITES).db.schemaName).toBe(schema)
    }
  })

  it("keeps a Site's globals to that Site too", async () => {
    await payloadOf("avada").updateGlobal({
      slug: "brand",
      data: { name: "Avada Properties" },
    })

    const nameSeenBy = async (site: keyof typeof SITES) =>
      (await payloadOf(site).findGlobal({ slug: "brand" })).name

    expect(await nameSeenBy("avada")).toBe("Avada Properties")
    expect(await nameSeenBy("warrenBeach")).not.toBe("Avada Properties")
    expect(await nameSeenBy("beachside")).not.toBe("Avada Properties")
  })

  it("still has nothing in public after Sites wrote content", async () => {
    expect(await tablesIn("public")).toEqual([])
  })
})

describe("the migration check", () => {
  it("passes on the migrations in src/migrations", () => {
    expect(findPublicQualifiers(migrationsDir)).toEqual([])
  })
})
