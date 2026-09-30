import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { afterEach, describe, expect, it } from "vitest"

import { findPublicQualifiers } from "./check-migrations"

const created: string[] = []
afterEach(() => {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true })
})

function migrationsDir(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "migrations-"))
  created.push(dir)
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(path.join(dir, name), body)
  }
  return dir
}

describe("findPublicQualifiers", () => {
  it("reports the file and line of a hardcoded public schema", () => {
    const dir = migrationsDir({
      "20260101_000000_bad.ts": [
        "export async function up() {",
        '  CREATE TYPE "public"."enum_x" AS ENUM(\'a\');',
        "}",
      ].join("\n"),
    })
    expect(findPublicQualifiers(dir)).toEqual([
      { file: "20260101_000000_bad.ts", line: 2 },
    ])
  })

  it("passes a schema-agnostic migration", () => {
    const dir = migrationsDir({
      "20260101_000000_ok.ts": "CREATE TYPE \"enum_x\" AS ENUM('a');\n",
      "index.ts": "export const migrations = []\n",
    })
    expect(findPublicQualifiers(dir)).toEqual([])
  })

  it("ignores the JSON snapshots Payload keeps beside the migrations", () => {
    const dir = migrationsDir({
      "20260101_000000_ok.json": '{"schema": "public", "a": "\\"public\\"."}',
    })
    expect(findPublicQualifiers(dir)).toEqual([])
  })

  it("finds it in every file, not just the first", () => {
    const dir = migrationsDir({
      "a.ts": '"public".a\n',
      "b.ts": 'ok\n"public".b\n',
    })
    expect(findPublicQualifiers(dir)).toEqual([
      { file: "a.ts", line: 1 },
      { file: "b.ts", line: 2 },
    ])
  })

  it("fails when the folder is missing, so a moved folder can't pass silently", () => {
    const dir = migrationsDir({})
    mkdirSync(path.join(dir, "x"))
    expect(() => findPublicQualifiers(path.join(dir, "nope"))).toThrow(/nope/)
  })

  it('keeps the real src/migrations free of "public".', () => {
    const real = fileURLToPath(new URL("../src/migrations", import.meta.url))
    expect(findPublicQualifiers(real)).toEqual([])
  })

  describe("as a command", () => {
    const script = fileURLToPath(
      new URL("./check-migrations.ts", import.meta.url)
    )
    const run = (dir: string) =>
      spawnSync("pnpm", ["exec", "tsx", script, dir], { encoding: "utf8" })

    it("exits non-zero and names the file when a migration hardcodes public", () => {
      const dir = migrationsDir({ "bad.ts": 'DROP TYPE "public"."x";\n' })
      const result = run(dir)
      expect(result.status).toBe(1)
      expect(result.stderr).toContain("bad.ts:1")
    })

    it("exits zero when every migration is schema-agnostic", () => {
      const dir = migrationsDir({ "ok.ts": 'DROP TYPE "x";\n' })
      expect(run(dir).status).toBe(0)
    })
  })
})
