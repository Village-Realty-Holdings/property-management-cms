/**
 * Makes a freshly generated Payload migration work for any Site schema
 * (apps/site ADR-0005).
 *
 *   pnpm --filter site migrate:create <name>     # with DATABASE_SCHEMA unset
 *   pnpm --filter site genericize src/migrations/<timestamp>_<name>.ts
 *
 * It strips the explicit `"public".` qualifier and makes up() and down()
 * start with setSiteSchema(), which creates the Site's schema if needed and
 * sets the search_path for the migration's transaction (src/setSiteSchema.ts).
 * Safe to run twice.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

export const SET_SITE_SCHEMA_CALL = "await setSiteSchema(db, payload)"

export type GenericizeResult = {
  source: string
  /** How many `"public".` qualifiers were removed. */
  stripped: number
}

export function genericizeMigration(source: string): GenericizeResult {
  if (source.includes("setSiteSchema")) return { source, stripped: 0 }

  const stripped = source.split('"public".').length - 1
  let result = source.replaceAll('"public".', "")

  for (const fn of ["up", "down"]) {
    const header = new RegExp(
      `(export async function ${fn}\\([^)]*\\)[^{\\n]*\\{\\n)`
    )
    if (!header.test(result)) {
      throw new Error(`No ${fn}() function found: is this a Payload migration?`)
    }
    result = result.replace(header, `$1  ${SET_SITE_SCHEMA_CALL}\n`)
  }

  const firstImport = /^import [^\n]*\n/m
  result = firstImport.test(result)
    ? result.replace(
        firstImport,
        (line) => `${line}\nimport { setSiteSchema } from '../setSiteSchema'\n`
      )
    : `import { setSiteSchema } from '../setSiteSchema'\n${result}`

  return { source: result, stripped }
}

function main(file: string | undefined) {
  if (!file) {
    throw new Error("usage: genericize-migration.ts <migration.ts>")
  }
  const { source, stripped } = genericizeMigration(readFileSync(file, "utf8"))
  writeFileSync(file, source)
  console.log(`${file}: stripped ${stripped} "public". qualifiers`)
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv[2])
}
