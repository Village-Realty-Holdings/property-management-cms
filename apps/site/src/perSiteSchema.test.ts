import { execFile } from "node:child_process"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import pg from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { migrations } from "./migrations"
import {
  createTestDatabase,
  getTestPayload,
  type TestDatabase,
  type TestPayload,
} from "./test/getTestPayload"

// Two Sites in one database (apps/site ADR-0005). The schemas are made by
// running the one migration on an empty database; the database is dropped
// with them in afterAll.
const A = "ms_1_per_site_schema_a"
const B = "ms_1_per_site_schema_b"

const appDir = fileURLToPath(new URL("..", import.meta.url))

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

let database: TestDatabase
let sql: pg.Client
let siteA: TestPayload
let siteB: TestPayload

const tablesIn = async (schema: string) =>
  (
    await sql.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY 1",
      [schema]
    )
  ).rows.map((row) => row.table_name)

const schemaExists = async (schema: string) =>
  (await sql.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [schema]))
    .rowCount === 1

const countPages = async (schema: string) =>
  Number(
    (
      await sql.query<{ n: string }>(
        `SELECT count(*) AS n FROM "${schema}"."pages"`
      )
    ).rows[0]!.n
  )

beforeAll(async () => {
  database = await createTestDatabase()
  sql = new pg.Client({ connectionString: database.url })
  await sql.connect()

  siteA = await getTestPayload({ database, schemaName: A, push: false })
  siteB = await getTestPayload({ database, schemaName: B, push: false })
})

afterAll(async () => {
  await siteA?.teardown()
  await siteB?.teardown()
  await sql?.end()
  await database?.drop()
})

describe("migrating a Site from zero", () => {
  it("creates neither schema until its migration runs", async () => {
    expect(await schemaExists(A)).toBe(false)
    expect(await schemaExists(B)).toBe(false)
  })

  it("creates the schema and every table in it, and only in it", async () => {
    await migrate(A)

    expect(await schemaExists(A)).toBe(true)
    const tables = await tablesIn(A)
    expect(tables).toEqual(
      expect.arrayContaining(["pages", "media", "users", "payload_migrations"])
    )
    expect(await tablesIn("public")).toEqual([])
    expect(await schemaExists(B)).toBe(false)
  })

  it("gives a second Site the same tables in its own schema", async () => {
    await migrate(B)

    expect(await tablesIn(B)).toEqual(await tablesIn(A))
    expect(await tablesIn("public")).toEqual([])
  })

  it("records each Site's migrations in its own schema", async () => {
    for (const schema of [A, B]) {
      const { rows } = await sql.query<{ name: string }>(
        `SELECT name FROM "${schema}"."payload_migrations" ORDER BY name`
      )
      expect(rows.map((r) => r.name)).toEqual(migrations.map((m) => m.name))
    }
  })
})

describe("two Sites in one database", () => {
  const home = (title: string) => ({
    title,
    path: "/",
    _status: "published" as const,
    layout: [{ blockType: "hero" as const, heading: title }],
  })

  it("keeps each Site's rows to itself", async () => {
    await siteA.payload.create({ collection: "pages", data: home("Home of A") })

    expect(await countPages(A)).toBe(1)
    expect(await countPages(B)).toBe(0)
    const seenByB = await siteB.payload.find({ collection: "pages" })
    expect(seenByB.totalDocs).toBe(0)

    await siteB.payload.create({ collection: "pages", data: home("Home of B") })

    const seenByA = await siteA.payload.find({ collection: "pages" })
    expect(seenByA.docs.map((page) => page.title)).toEqual(["Home of A"])
    expect(
      (await siteB.payload.find({ collection: "pages" })).docs.map(
        (page) => page.title
      )
    ).toEqual(["Home of B"])
  })

  it("allows the same path in both, since each schema has its own constraints", async () => {
    expect(await countPages(A)).toBe(1)
    expect(await countPages(B)).toBe(1)
  })

  it("still leaves the public schema empty", async () => {
    expect(await tablesIn("public")).toEqual([])
  })

  it("reports the schema each Payload runs in", () => {
    expect(siteA.payload.db.schemaName).toBe(A)
    expect(siteB.payload.db.schemaName).toBe(B)
  })
})
