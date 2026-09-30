/**
 * Runs an apps/site package script as one Site (apps/site ADR-0005):
 *
 *   pnpm site avada dev
 *   pnpm site avada migrate
 *   pnpm site warren-beach migrate:create add_thing
 *
 * `<slug>` picks apps/site/.env.<slug> (copy it from .env.<slug>.example).
 * Everything after `<command>` goes to the script.
 *
 * Precedence: variables that say which Site this is (DATABASE_SCHEMA,
 * SITE_URL, PORT) come from the Site's env file, so a stray variable in your
 * shell can't point `pnpm site avada dev` at another Site's schema. Every
 * other variable already set in the shell wins over the file, so
 * `DATABASE_URL=... pnpm site avada migrate` works for one run.
 */
import { spawn } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { parse } from "dotenv"

const SITE_IDENTITY = ["DATABASE_SCHEMA", "SITE_URL", "PORT"] as const

const USAGE =
  "usage: pnpm site <slug> <command> [args...]  (e.g. pnpm site avada dev)"

export type SiteRun = {
  slug: string
  /** The apps/site package.json script to run. */
  script: string
  /** Extra arguments for the script. */
  args: string[]
  envFile: string
  /** The environment to run it in. */
  env: Record<string, string | undefined>
}

type Deps = {
  /** apps/site, where the env files live and the script runs. */
  appDir: string
  /** File contents, or undefined when the file doesn't exist. */
  readFile: (file: string) => string | undefined
  processEnv: Record<string, string | undefined>
}

export function resolveSiteRun(
  [slug, script, ...args]: string[],
  { appDir, readFile, processEnv }: Deps
): SiteRun {
  if (slug === undefined || script === undefined) throw new Error(USAGE)
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      `Site slug ${JSON.stringify(slug)} must be lowercase letters, digits and dashes (e.g. warren-beach). ${USAGE}`
    )
  }
  if (!/^[a-z][a-z0-9:_-]*$/i.test(script)) {
    throw new Error(
      `${JSON.stringify(script)} is not a package script name. ${USAGE}`
    )
  }

  const envFile = path.join(appDir, `.env.${slug}`)
  const contents = readFile(envFile)
  if (contents === undefined) {
    throw new Error(
      `No env file for Site "${slug}" at ${envFile}. Copy ${path.basename(envFile)}.example there and fill it in.`
    )
  }
  const fromFile = parse(contents)
  if (!fromFile.DATABASE_SCHEMA) {
    throw new Error(
      `${envFile} must set DATABASE_SCHEMA, or the Site would run in the public schema.`
    )
  }

  const env = { ...fromFile, ...processEnv }
  for (const key of SITE_IDENTITY) {
    if (fromFile[key] !== undefined) env[key] = fromFile[key]
  }
  return { slug, script, args, envFile, env }
}

function main(argv: string[]) {
  const appDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
  let run: SiteRun
  try {
    run = resolveSiteRun(argv, {
      appDir,
      readFile: (file) => {
        try {
          return readFileSync(file, "utf8")
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return
          throw error
        }
      },
      processEnv: process.env,
    })
  } catch (error) {
    console.error((error as Error).message)
    process.exit(2)
  }

  console.log(
    `Site ${run.slug}: schema ${run.env.DATABASE_SCHEMA}${run.env.PORT ? `, port ${run.env.PORT}` : ""}`
  )
  const child = spawn("pnpm", ["run", run.script, ...run.args], {
    cwd: appDir,
    env: run.env as NodeJS.ProcessEnv,
    stdio: "inherit",
  })
  child.on("exit", (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0))
  })
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => child.kill(signal))
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2))
}
