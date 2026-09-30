import { randomBytes } from "node:crypto"

import pg from "pg"
import { getPayload, type Payload } from "payload"

import { buildPayloadConfig } from "../payload.config"

type TestPayloadOptions = Omit<
  Parameters<typeof buildPayloadConfig>[0],
  "databaseUrl" | "push"
> & {
  /**
   * Push the schema from the config (the default), or leave the database
   * empty so the test can run `payload.db.migrate()` itself.
   */
  push?: boolean
  /**
   * Use this database, made with `createTestDatabase()`, instead of a new
   * one, so several Payloads (one per `schemaName`) can share it. The caller
   * drops it.
   */
  database?: TestDatabase
}

export type TestDatabase = {
  /** Connection string of the throwaway database. */
  url: string
  /** Drops the database, terminating any connection still open to it. */
  drop: () => Promise<void>
}

export type TestPayload = {
  payload: Payload
  /** Connection string of the throwaway database. */
  databaseUrl: string
  /** Shuts Payload down and drops the throwaway database. */
  teardown: () => Promise<void>
}

/**
 * Creates an empty Postgres database (`pm_test_<random>`) on the server
 * named by DATABASE_URL.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const serverUrl = process.env.DATABASE_URL
  if (!serverUrl) {
    throw new Error("DATABASE_URL must be set to run integration tests")
  }

  const name = `pm_test_${randomBytes(6).toString("hex")}`
  await withAdminClient(serverUrl, (client) =>
    client.query(`CREATE DATABASE "${name}"`)
  )
  const url = new URL(serverUrl)
  url.pathname = `/${name}`
  return { url: url.toString(), drop: () => dropDatabase(serverUrl, name) }
}

/**
 * Starts Payload against a new, empty Postgres database (`pm_test_<random>`)
 * on the server named by DATABASE_URL, with the schema pushed from the config.
 * Tests run in the `public` schema unless they pass `schemaName`.
 *
 * Call it once per test file and always call `teardown` afterwards:
 *
 *   let t: TestPayload
 *   beforeAll(async () => { t = await getTestPayload() })
 *   afterAll(() => t.teardown())
 */
export async function getTestPayload(
  options: TestPayloadOptions = {}
): Promise<TestPayload> {
  const { push = true, database, ...configOptions } = options
  const db = database ?? (await createTestDatabase())
  const dropOwnDatabase = database ? async () => {} : db.drop

  let payload: Payload
  try {
    payload = await getPayload({
      key: `${db.url}#${configOptions.schemaName ?? "public"}`,
      config: buildPayloadConfig({
        ...configOptions,
        databaseUrl: db.url,
        push,
      }),
    })
  } catch (error) {
    await dropOwnDatabase()
    throw error
  }

  return {
    payload,
    databaseUrl: db.url,
    teardown: async () => {
      try {
        const pool = payload.db.pool
        await payload.destroy()
        await closeConnections(pool)
      } finally {
        await dropOwnDatabase()
      }
    },
  }
}

/**
 * Closes every connection Payload's pool opened, and waits for them, so that
 * dropping the database afterwards has nothing left to terminate. Terminating
 * a connection that is still open makes Postgres send it error 57P01, which
 * nothing listens for on a connection the pool has lent out, so the run
 * reports an unhandled error long after the test passed.
 *
 * `pool.end()` would do it, but it never settles here: the Postgres adapter
 * checks one client out to watch the connection and never gives it back, and
 * `end()` waits for every lent client. So end the clients themselves.
 */
async function closeConnections(pool: pg.Pool | undefined) {
  if (!pool) return
  pool.on("error", () => {})
  const clients = (pool as unknown as { _clients?: pg.Client[] })._clients ?? []
  await Promise.allSettled(clients.map((client) => client.end()))
}

async function dropDatabase(serverUrl: string, dbName: string) {
  await withAdminClient(serverUrl, (client) =>
    client.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`)
  )
}

/** Runs `fn` with a client connected to the server's `postgres` database. */
async function withAdminClient<T>(
  serverUrl: string,
  fn: (client: pg.Client) => Promise<T>
): Promise<T> {
  const url = new URL(serverUrl)
  url.pathname = "/postgres"
  const client = new pg.Client({ connectionString: url.toString() })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}
