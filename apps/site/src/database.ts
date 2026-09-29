import pg from "pg"

/**
 * The `pg` module Payload's Postgres adapter uses, chosen here and nowhere
 * else (apps/cms ADR-0015).
 *
 * On Node (dev, tests, Containers): `pg` as is, with its usual pool.
 *
 * On Cloudflare Workers: a socket belongs to the request that opened it, and
 * workerd cancels any other request that touches it ("code had hung").
 * Payload keeps one pool for the life of the isolate, so pg.Pool would hand
 * request B a connection request A opened. There, every checkout opens its
 * own connection in the request asking for it, and release closes it.
 * Hyperdrive pools the real connections behind the connection string, so a
 * connection per checkout stays cheap.
 */
export function pgForRuntime(runtime: Runtime = currentRuntime()): typeof pg {
  return runtime === "workers" ? { ...pg, Pool: ConnectionPerCheckoutPool } : pg
}

export type Runtime = "workers" | "node"

export function currentRuntime(): Runtime {
  return globalThis.navigator?.userAgent === "Cloudflare-Workers"
    ? "workers"
    : "node"
}

type Callback = (
  err: Error | undefined,
  client: pg.PoolClient | undefined,
  done: (release?: unknown) => void
) => void

/**
 * A pg.Pool that pools nothing: `connect()` opens a new Client and its
 * `release()` ends it. Still a pg.Pool, so Drizzle treats it as one (a
 * transaction checks out one client and keeps it to the end), and
 * `pool.query()` goes through `connect()` as pg-pool's does.
 */
export class ConnectionPerCheckoutPool extends pg.Pool {
  override connect(): Promise<pg.PoolClient>
  override connect(callback: Callback): void
  override connect(callback?: Callback): Promise<pg.PoolClient> | void {
    const opened = this.open()
    if (!callback) return opened
    opened.then(
      (client) => callback(undefined, client, () => client.release()),
      (err: Error) => callback(err, undefined, () => {})
    )
  }

  override async end(): Promise<void> {
    // Nothing is pooled: each client is ended by its release.
  }

  private async open(): Promise<pg.PoolClient> {
    const Client =
      (this.options as { Client?: typeof pg.Client }).Client ?? pg.Client
    const client = new Client(this.options)
    let released = false
    const release = () => {
      if (released) return
      released = true
      client.end().catch(() => {})
    }
    try {
      await client.connect()
    } catch (err) {
      release()
      throw err
    }
    return Object.assign(client, { release })
  }
}
