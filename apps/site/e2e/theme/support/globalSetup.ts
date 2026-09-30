import { execFile, spawn, type ChildProcess } from "node:child_process"
import { appendFileSync, rmSync } from "node:fs"
import path from "node:path"
import { promisify } from "node:util"

import pg from "pg"

import { APP_DIR, ORIGIN, PORT, SCHEMA, databaseUrl, siteEnv } from "./env"

/**
 * Starts the Site for the Theme acceptance tests: creates the scratch schema
 * with `payload migrate`, starts `next dev` against it, waits until it
 * answers, and warms the routes the tests visit (the first request compiles a
 * route). Teardown stops the server and drops the schema, unless
 * `E2E_KEEP_SCHEMA=1`. `E2E_REUSE_SERVER=1` reuses a server already listening
 * on the port (its schema is then not dropped either).
 */

let server: ChildProcess | undefined
let reused = false

const WARM_UP = ["/", "/dev/theme-sample", "/admin/sign-in"]

export async function setup() {
  const url = databaseUrl()
  // A fresh, empty schema: the migration then builds it from zero.
  await dropSchema(url)
  await promisify(execFile)("pnpm", ["exec", "payload", "migrate"], {
    cwd: APP_DIR,
    env: siteEnv(),
  })

  if (process.env.E2E_REUSE_SERVER === "1" && (await answers("/"))) {
    reused = true
    return
  }
  if (await answers("/")) {
    throw new Error(
      `Something already listens on port ${PORT}. Stop it, pick another E2E_PORT, or set E2E_REUSE_SERVER=1.`
    )
  }

  const log: string[] = []
  // E2E_SERVER_LOG=<file> keeps the dev server's output, for debugging.
  const logFile = process.env.E2E_SERVER_LOG
  const child = spawn("pnpm", ["exec", "next", "dev", "--port", String(PORT)], {
    cwd: APP_DIR,
    env: siteEnv(),
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  })
  server = child
  for (const stream of [child.stdout, child.stderr]) {
    stream?.on("data", (chunk: Buffer) => {
      log.push(chunk.toString())
      if (logFile) appendFileSync(logFile, chunk)
      if (log.length > 200) log.shift()
    })
  }
  const exited = new Promise<never>((_, reject) =>
    child.once("exit", (code) =>
      reject(
        new Error(
          `next dev exited with code ${code}:\n${log.join("").slice(-3000)}`
        )
      )
    )
  )
  await Promise.race([waitUntilAnswering(), exited])
  for (const path of WARM_UP) await fetch(`${ORIGIN}${path}`)
}

export async function teardown() {
  if (server?.pid) {
    try {
      process.kill(-server.pid, "SIGTERM")
    } catch {
      // Already gone.
    }
  }
  if (reused || process.env.E2E_KEEP_SCHEMA === "1") return
  await dropSchema(databaseUrl())
  // Fonts the tests added (media/<schema>/fonts).
  rmSync(path.join(APP_DIR, "media", SCHEMA), { recursive: true, force: true })
}

async function answers(path: string): Promise<boolean> {
  try {
    await fetch(`${ORIGIN}${path}`, { signal: AbortSignal.timeout(3000) })
    return true
  } catch {
    return false
  }
}

async function waitUntilAnswering(): Promise<void> {
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    if (await answers("/")) return
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`The Site did not answer on ${ORIGIN} within 2 minutes.`)
}

async function withClient(
  url: string,
  fn: (client: pg.Client) => Promise<void>
) {
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    await fn(client)
  } finally {
    await client.end()
  }
}

const quoted = (name: string) => `"${name.replace(/"/g, '""')}"`

async function dropSchema(url: string) {
  await withClient(url, async (client) => {
    await client.query(`DROP SCHEMA IF EXISTS ${quoted(SCHEMA)} CASCADE`)
  })
}
