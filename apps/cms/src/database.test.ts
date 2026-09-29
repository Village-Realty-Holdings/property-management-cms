import { EventEmitter } from "node:events"

import pg from "pg"
import { afterEach, describe, expect, it } from "vitest"

import { ConnectionPerCheckoutPool, pgForRuntime } from "./database"

const connectionString = process.env.DATABASE_URL

type QueryCallback = (
  err: Error | undefined,
  result: { rows: unknown[] }
) => void

/** A Client that records its lifecycle instead of touching the network. */
function fakeClients() {
  const log: string[] = []
  let next = 0
  class FakeClient extends EventEmitter {
    id = ++next
    async connect() {
      log.push(`connect ${this.id}`)
    }
    async end() {
      log.push(`end ${this.id}`)
    }
    // pg-pool's pool.query() calls it callback-style.
    query(text: string, _values: unknown, callback: QueryCallback) {
      log.push(`query ${this.id} ${text}`)
      callback(undefined, { rows: [{ client: this.id }] })
    }
  }
  return { log, Client: FakeClient as unknown as typeof pg.Client }
}

describe("pgForRuntime", () => {
  it("keeps pg as is on Node", () => {
    expect(pgForRuntime("node")).toBe(pg)
  })

  it("swaps in the connection-per-checkout pool on Workers", () => {
    const workersPg = pgForRuntime("workers")
    expect(workersPg.Pool).toBe(ConnectionPerCheckoutPool)
    expect(workersPg.Client).toBe(pg.Client)
    expect(workersPg.types).toBe(pg.types)
  })
})

describe("ConnectionPerCheckoutPool", () => {
  const pools: pg.Pool[] = []
  const poolWith = (Client: typeof pg.Client) => {
    const pool = new ConnectionPerCheckoutPool({ Client } as pg.PoolConfig)
    pools.push(pool)
    return pool
  }
  afterEach(async () => {
    await Promise.all(pools.splice(0).map((p) => p.end()))
  })

  it("opens a new connection for every checkout and closes it on release", async () => {
    const { log, Client } = fakeClients()
    const pool = poolWith(Client)

    const a = await pool.connect()
    const b = await pool.connect()
    expect(a).not.toBe(b)
    a.release()
    a.release() // a second release is a no-op
    b.release()
    await Promise.resolve()

    expect(log).toEqual(["connect 1", "connect 2", "end 1", "end 2"])
  })

  it("never reuses a released connection", async () => {
    const { log, Client } = fakeClients()
    const pool = poolWith(Client)

    const first = await pool.connect()
    first.release()
    const second = await pool.connect()
    second.release()
    await Promise.resolve()

    expect(log).toEqual(["connect 1", "end 1", "connect 2", "end 2"])
  })

  it("runs pool.query on its own connection, then closes it", async () => {
    const { log, Client } = fakeClients()
    const pool = poolWith(Client)

    const result = await pool.query("select 1")
    await Promise.resolve()

    expect(result.rows).toEqual([{ client: 1 }])
    expect(log).toEqual(["connect 1", "query 1 select 1", "end 1"])
  })

  it("closes the connection and rejects when connecting fails", async () => {
    const { log, Client } = fakeClients()
    class Failing extends (Client as unknown as new () => { id: number }) {
      async connect() {
        log.push(`connect ${this.id}`)
        throw new Error("refused")
      }
    }
    const pool = poolWith(Failing as unknown as typeof pg.Client)

    await expect(pool.connect()).rejects.toThrow("refused")
    await Promise.resolve()
    expect(log).toEqual(["connect 1", "end 1"])
  })

  it.skipIf(!connectionString)(
    "queries Postgres, in and out of a transaction",
    async () => {
      const pool = new ConnectionPerCheckoutPool({ connectionString })
      pools.push(pool)

      const { rows } = await pool.query<{ n: number }>("select 1 as n")
      expect(rows).toEqual([{ n: 1 }])

      const client = await pool.connect()
      try {
        await client.query("begin")
        const pid = await client.query("select pg_backend_pid() as pid")
        const again = await client.query("select pg_backend_pid() as pid")
        expect(again.rows[0].pid).toBe(pid.rows[0].pid)
        await client.query("commit")
      } finally {
        client.release()
      }

      const other = await pool.query("select pg_backend_pid() as pid")
      expect(other.rows[0].pid).toBeTypeOf("number")
    }
  )
})
