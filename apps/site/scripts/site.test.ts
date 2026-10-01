import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { resolveSiteRun } from "./site"

const appDir = "/repo/apps/site"

/** An in-memory apps/site folder: env file name -> contents. */
function folder(files: Record<string, string>) {
  return (file: string) => files[file.replace(`${appDir}/`, "")]
}

const avadaEnv = [
  "DATABASE_URL=postgres://u:p@localhost:5432/db",
  "DATABASE_SCHEMA=avada",
  "SITE_URL=http://localhost:3002",
  "PORT=3002",
  "# a comment",
  'PAYLOAD_SECRET="s3cret value"',
].join("\n")

const resolve = (
  argv: string[],
  files: Record<string, string> = { ".env.avada": avadaEnv },
  processEnv: Record<string, string | undefined> = {}
) => resolveSiteRun(argv, { appDir, readFile: folder(files), processEnv })

describe("resolveSiteRun", () => {
  it("runs the package script in apps/site with the Site's env", () => {
    const run = resolve(["avada", "dev"])
    expect(run.script).toBe("dev")
    expect(run.args).toEqual([])
    expect(run.envFile).toBe(`${appDir}/.env.avada`)
    expect(run.env).toMatchObject({
      DATABASE_SCHEMA: "avada",
      PORT: "3002",
      SITE_URL: "http://localhost:3002",
      PAYLOAD_SECRET: "s3cret value",
    })
  })

  it("passes the rest of the command line to the script", () => {
    const run = resolve(["avada", "migrate:create", "add_thing"])
    expect(run.script).toBe("migrate:create")
    expect(run.args).toEqual(["add_thing"])
  })

  it("keeps variables already in the shell over the env file, so DATABASE_URL can be overridden for one run", () => {
    const run = resolve(["avada", "migrate"], undefined, {
      DATABASE_URL: "postgres://other/scratch",
      HOME: "/home/x",
    })
    expect(run.env.DATABASE_URL).toBe("postgres://other/scratch")
    expect(run.env.DATABASE_SCHEMA).toBe("avada")
    expect(run.env.HOME).toBe("/home/x")
  })

  it("does not let one Site's schema leak in from the shell", () => {
    const run = resolve(["avada", "dev"], undefined, {
      DATABASE_SCHEMA: "beachside",
    })
    expect(run.env.DATABASE_SCHEMA).toBe("avada")
  })

  it("tells you to copy the template when the Site has no env file", () => {
    expect(() => resolve(["warren-beach", "dev"], {})).toThrow(
      /\.env\.warren-beach.*\.env\.warren-beach\.example/s
    )
  })

  it("refuses an env file that does not name a schema, so a Site never runs in public by accident", () => {
    expect(() =>
      resolve(["avada", "dev"], { ".env.avada": "DATABASE_URL=x" })
    ).toThrow(/DATABASE_SCHEMA/)
  })

  it.each([[[]], [["avada"]]])("explains the usage for %j", (argv) => {
    expect(() => resolve(argv)).toThrow(/usage: pnpm site <slug> <command>/)
  })

  it.each(["../secret", "Avada", "a/b", ".env", "avada.local"])(
    "rejects the Site slug %j",
    (slug) => {
      expect(() => resolve([slug, "dev"])).toThrow(/Site slug/)
    }
  )

  it.each(["dev;rm", "--filter", "$(x)", ""])(
    "rejects the command %j",
    (cmd) => {
      expect(() => resolve(["avada", cmd])).toThrow(/command/)
    }
  )
})

describe("the committed Site env templates", () => {
  const realAppDir = fileURLToPath(new URL("..", import.meta.url)).replace(
    /\/$/,
    ""
  )
  const templates = (slug: string) =>
    resolveSiteRun([slug, "dev"], {
      appDir: realAppDir,
      readFile: (file) => readFileSync(`${file}.example`, "utf8"),
      processEnv: {},
    }).env

  it.each([
    ["warren-beach", "warren_beach", "3001"],
    ["avada", "avada", "3002"],
    ["beachside", "beachside", "3003"],
  ])("%s has its own schema, port and URL", (slug, schema, port) => {
    expect(templates(slug)).toMatchObject({
      DATABASE_SCHEMA: schema,
      PORT: port,
      SITE_URL: `http://localhost:${port}`,
    })
  })
})
