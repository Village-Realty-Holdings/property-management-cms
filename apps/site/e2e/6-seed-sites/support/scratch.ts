/* eslint-disable turbo/no-undeclared-env-vars -- E2E_* switches of the acceptance tests, which are not turbo tasks */
import { execFile, spawn, type ChildProcess } from "node:child_process"
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"

import { parse } from "dotenv"
import pg from "pg"

import type { Snapshot } from "../match"
import {
  KEEP_SCHEMA,
  KEEP_WORKTREES,
  PORT_BASE,
  REPO_ROOT,
  WORKTREES_DIR,
  databaseUrl,
} from "./env"
import { SITES, type SiteSpec } from "./sites"

/**
 * The machinery of the Phase 6 acceptance tests: scratch worktrees, the
 * Sites' env files, `pnpm site <slug> …` commands, the running Sites, and
 * snapshots of what a Site has stored. Everything the tests check about the
 * Sites goes through a browser or HTTP; the snapshots are only there to tell
 * that a second seed run changed nothing.
 */

export type Result = { code: number; stdout: string; stderr: string }

/** Runs a command to the end, never throwing: the exit code is returned. */
export function runCommand(
  file: string,
  args: readonly string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeout?: number }
): Promise<Result> {
  return new Promise((resolve) => {
    execFile(
      file,
      [...args],
      {
        cwd: options.cwd,
        env: options.env ?? process.env,
        timeout: options.timeout ?? 600_000,
        maxBuffer: 256 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const code =
          error === null ? 0 : typeof error.code === "number" ? error.code : 1
        resolve({ code, stdout: String(stdout), stderr: String(stderr) })
      }
    )
  })
}

/** Runs a command and throws with its output when it fails. */
export async function mustRun(
  file: string,
  args: readonly string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeout?: number }
): Promise<string> {
  const result = await runCommand(file, args, options)
  if (result.code !== 0) {
    throw new Error(
      `${file} ${args.join(" ")} (in ${options.cwd}) exited with ${result.code}:\n${tail(result)}`
    )
  }
  return result.stdout
}

/** The last lines a command printed, for a failure message. */
export function tail(result: Result, chars = 4000): string {
  return `${result.stdout}\n${result.stderr}`.slice(-chars)
}

/** A Site as this run has it: its scratch worktree, port and origin. */
export type RunningSite = SiteSpec & {
  /** The scratch worktree's root. */
  dir: string
  /** apps/site inside it: where `pnpm site` runs. */
  appDir: string
  /** The schema its env file names. */
  schema: string
  port: number
  origin: string
}

/**
 * The environment `pnpm site <slug> …` runs in. Which Site it is (schema,
 * port, URL) comes from the Site's env file, which `pnpm site` gives the last
 * word; everything else set here wins over the file, so no run of this suite
 * can reach object storage, Entra or another database.
 */
export function commandEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "development",
    DATABASE_URL: databaseUrl(),
    DEV_SIGN_IN: "1",
    ENTRA_TENANT_ID: "",
    ENTRA_CLIENT_ID: "",
    S3_BUCKET: "",
    S3_ENDPOINT: "",
    S3_ACCESS_KEY_ID: "",
    S3_SECRET_ACCESS_KEY: "",
    S3_PUBLIC_URL: "",
    NEXT_TELEMETRY_DISABLED: "1",
    HUSKY: "0",
  }
  for (const key of ["DATABASE_SCHEMA", "PORT", "SITE_URL"]) delete env[key]
  return env
}

const git = (args: readonly string[], cwd = REPO_ROOT) =>
  mustRun("git", args, { cwd, timeout: 120_000 })

async function removeWorktree(dir: string) {
  if (existsSync(dir)) {
    await runCommand("git", ["worktree", "remove", "--force", dir], {
      cwd: REPO_ROOT,
    })
    rmSync(dir, { recursive: true, force: true })
  }
  await runCommand("git", ["worktree", "prune"], { cwd: REPO_ROOT })
}

/**
 * The Site's env file for this run: its committed template
 * (apps/site/.env.<slug>.example) with the scratch database, this run's port
 * and URL, the dev sign-in, and nothing that reaches outside the machine.
 * The schema stays the template's.
 */
function writeEnvFile(appDir: string, site: SiteSpec, port: number): string {
  const template = path.join(appDir, `.env.${site.slug}.example`)
  if (!existsSync(template)) {
    throw new Error(`The Site ${site.slug} has no env template at ${template}`)
  }
  const values: Record<string, string> = {
    ...parse(readFileSync(template, "utf8")),
    DATABASE_URL: databaseUrl(),
    PORT: String(port),
    SITE_URL: `http://localhost:${port}`,
    PAYLOAD_SECRET: "e2e-seed-sites-secret",
    DEV_SIGN_IN: "1",
    ENTRA_TENANT_ID: "",
    ENTRA_CLIENT_ID: "",
    S3_BUCKET: "",
    S3_ENDPOINT: "",
    S3_ACCESS_KEY_ID: "",
    S3_SECRET_ACCESS_KEY: "",
    S3_PUBLIC_URL: "",
  }
  const schema = values.DATABASE_SCHEMA ?? ""
  writeFileSync(
    path.join(appDir, `.env.${site.slug}`),
    Object.entries(values)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join("\n") + "\n"
  )
  return schema
}

/**
 * Makes one scratch worktree per Site from this checkout: HEAD, plus the
 * uncommitted changes and new files, installed, with the Site's env file.
 * Any earlier scratch worktree of the same name is replaced.
 */
export async function prepareSites(
  sites: readonly SiteSpec[] = SITES
): Promise<RunningSite[]> {
  mkdirSync(WORKTREES_DIR, { recursive: true })
  const head = (await git(["rev-parse", "HEAD"])).trim()
  const patch = path.join(WORKTREES_DIR, "uncommitted.patch")
  writeFileSync(
    patch,
    await git(["diff", "HEAD", "--binary", "--no-ext-diff", "--no-color"])
  )
  const untracked = (
    await git(["ls-files", "--others", "--exclude-standard", "-z"])
  )
    .split("\0")
    .filter(Boolean)

  const prepared: RunningSite[] = []
  for (const [index, site] of sites.entries()) {
    const dir = path.join(WORKTREES_DIR, site.slug)
    await removeWorktree(dir)
    await git(["worktree", "add", "--detach", dir, head])
    if (statSync(patch).size > 0) {
      await git(["apply", "--binary", "--whitespace=nowarn", patch], dir)
    }
    for (const file of untracked) {
      const target = path.join(dir, file)
      mkdirSync(path.dirname(target), { recursive: true })
      copyFileSync(path.join(REPO_ROOT, file), target)
    }
    await mustRun(
      "pnpm",
      ["install", "--prefer-offline", "--frozen-lockfile"],
      {
        cwd: dir,
        env: { ...process.env, HUSKY: "0" },
        timeout: 900_000,
      }
    )
    const appDir = path.join(dir, "apps", "site")
    const port = PORT_BASE + index
    const schema = writeEnvFile(appDir, site, port)
    prepared.push({
      ...site,
      dir,
      appDir,
      schema,
      port,
      origin: `http://localhost:${port}`,
    })
  }
  rmSync(patch, { force: true })
  return prepared
}

/** Removes the scratch worktrees, unless `E2E_KEEP_WORKTREES=1`. */
export async function removeSites(sites: readonly RunningSite[]) {
  if (KEEP_WORKTREES) return
  for (const site of sites) await removeWorktree(site.dir)
  try {
    rmdirSync(WORKTREES_DIR)
  } catch {
    // Not empty (another checkout's worktrees), or already gone.
  }
}

/** `pnpm site <slug> seed`, from the Site's worktree. */
export function seed(site: RunningSite): Promise<Result> {
  return runCommand("pnpm", ["run", "site", site.slug, "seed"], {
    cwd: site.appDir,
    env: commandEnv(),
    timeout: 900_000,
  })
}

/** Seeds, and throws with the seed's output when it fails. */
export async function mustSeed(site: RunningSite): Promise<void> {
  const result = await seed(site)
  if (result.code !== 0) {
    throw new Error(
      `pnpm site ${site.slug} seed exited with ${result.code}:\n${tail(result)}`
    )
  }
}

/** The local Media folder of a Site in its worktree (no S3 in this suite). */
export function mediaDir(site: RunningSite): string {
  return path.join(site.appDir, "media", site.schema)
}

/** Every file under `dir`, as "relative/path" → size in bytes. */
export function filesSnapshot(dir: string): Snapshot {
  const found: Snapshot = {}
  const walk = (folder: string) => {
    if (!existsSync(folder)) return
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name)
      if (entry.isDirectory()) walk(full)
      else found[path.relative(dir, full)] = String(statSync(full).size)
    }
  }
  walk(dir)
  return found
}

async function withClient<T>(fn: (client: pg.Client) => Promise<T>) {
  const client = new pg.Client({ connectionString: databaseUrl() })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

const quoted = (name: string) => `"${name.replace(/"/g, '""')}"`

/** Drops the Sites' schemas in the scratch database and their local Media. */
export async function resetSites(sites: readonly RunningSite[]) {
  await withClient(async (client) => {
    for (const site of sites) {
      await client.query(`DROP SCHEMA IF EXISTS ${quoted(site.schema)} CASCADE`)
    }
  })
  for (const site of sites) {
    rmSync(mediaDir(site), { recursive: true, force: true })
  }
}

/** At the end of a spec file: drops the schemas unless `E2E_KEEP_SCHEMA=1`. */
export async function cleanUpSites(sites: readonly RunningSite[]) {
  if (!KEEP_SCHEMA && sites.length > 0) await resetSites(sites)
  await removeSites(sites)
}

export async function schemaExists(schema: string): Promise<boolean> {
  return withClient(async (client) => {
    const { rowCount } = await client.query(
      "SELECT 1 FROM information_schema.schemata WHERE schema_name = $1",
      [schema]
    )
    return (rowCount ?? 0) > 0
  })
}

/** How many migrations the schema has run (Payload's own record of them). */
export async function migrationsRun(schema: string): Promise<number> {
  return withClient(async (client) => {
    const { rows } = await client.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM ${quoted(schema)}.payload_migrations`
    )
    return rows[0]?.count ?? 0
  })
}

/**
 * What a schema holds, table by table: the row count, and the newest
 * `updated_at` where the table has one. A seed run that adds, duplicates or
 * rewrites anything changes this snapshot; a no-op leaves it as it was.
 */
export async function schemaSnapshot(schema: string): Promise<Snapshot> {
  return withClient(async (client) => {
    const { rows: tables } = await client.query<{ name: string }>(
      `SELECT table_name AS name FROM information_schema.tables
       WHERE table_schema = $1 AND table_type = 'BASE TABLE' ORDER BY 1`,
      [schema]
    )
    const { rows: stamped } = await client.query<{ name: string }>(
      `SELECT table_name AS name FROM information_schema.columns
       WHERE table_schema = $1 AND column_name = 'updated_at'`,
      [schema]
    )
    const hasStamp = new Set(stamped.map((row) => row.name))
    const snapshot: Snapshot = {}
    for (const { name } of tables) {
      const table = `${quoted(schema)}.${quoted(name)}`
      const { rows } = await client.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM ${table}`
      )
      snapshot[`${name} rows`] = String(rows[0]?.count ?? 0)
      if (hasStamp.has(name)) {
        const { rows: newest } = await client.query<{ at: string | null }>(
          `SELECT max(updated_at)::text AS at FROM ${table}`
        )
        snapshot[`${name} last updated`] = newest[0]?.at ?? "never"
      }
    }
    return snapshot
  })
}

async function answers(origin: string): Promise<boolean> {
  try {
    await fetch(origin, { signal: AbortSignal.timeout(3000) })
    return true
  } catch {
    return false
  }
}

async function waitUntilAnswering(origin: string): Promise<void> {
  const deadline = Date.now() + 240_000
  while (Date.now() < deadline) {
    if (await answers(origin)) return
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`The Site did not answer on ${origin} within 4 minutes.`)
}

/** The first request to a route compiles it; these are what the tests open. */
const WARM_UP = ["/", "/admin/sign-in"]

/**
 * Starts every Site at once, each with `pnpm site <slug> dev` from its own
 * worktree, and waits until all of them answer. Resolves to a function that
 * stops them all. `E2E_SERVER_LOG=<file>` keeps their output.
 */
export async function startSites(
  sites: readonly RunningSite[]
): Promise<() => Promise<void>> {
  for (const site of sites) {
    if (await answers(site.origin)) {
      throw new Error(
        `Something already listens on port ${site.port}. Stop it, or pick other ports with E2E_SITES_PORT.`
      )
    }
  }
  const children: ChildProcess[] = []
  const stop = async () => {
    for (const child of children) {
      if (!child.pid) continue
      try {
        process.kill(-child.pid, "SIGTERM")
      } catch {
        // Already gone.
      }
    }
  }
  try {
    await Promise.all(
      sites.map((site) => {
        const log: string[] = []
        const child = spawn("pnpm", ["run", "site", site.slug, "dev"], {
          cwd: site.appDir,
          env: commandEnv(),
          detached: true,
          stdio: ["ignore", "pipe", "pipe"],
        })
        children.push(child)
        for (const stream of [child.stdout, child.stderr]) {
          stream?.on("data", (chunk: Buffer) => {
            log.push(chunk.toString())
            if (log.length > 200) log.shift()
            if (process.env.E2E_SERVER_LOG) {
              appendFileSync(
                process.env.E2E_SERVER_LOG,
                `[${site.slug}] ${chunk.toString()}`
              )
            }
          })
        }
        const exited = new Promise<never>((_, reject) =>
          child.once("exit", (code) =>
            reject(
              new Error(
                `pnpm site ${site.slug} dev exited with code ${code}:\n${log.join("").slice(-3000)}`
              )
            )
          )
        )
        // Stopping the Site later ends the process too; that is not an error.
        exited.catch(() => undefined)
        return Promise.race([
          (async () => {
            await waitUntilAnswering(site.origin)
            for (const route of WARM_UP) await fetch(`${site.origin}${route}`)
          })(),
          exited,
        ])
      })
    )
  } catch (error) {
    await stop()
    throw error
  }
  return stop
}
