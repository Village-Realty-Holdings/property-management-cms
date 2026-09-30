/**
 * Fails when a migration in src/migrations names the `public` schema
 * (`"public".`), which would tie it to one schema (apps/site ADR-0005).
 * Runs as part of `pnpm lint`; pass a folder to check another one. To fix a flagged file, run
 * `pnpm --filter site genericize <file>`.
 */
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

export type PublicQualifier = { file: string; line: number }

export function findPublicQualifiers(dir: string): PublicQualifier[] {
  const found: PublicQualifier[] = []
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .sort()) {
    readFileSync(path.join(dir, file), "utf8")
      .split("\n")
      .forEach((text, index) => {
        if (text.includes('"public".')) found.push({ file, line: index + 1 })
      })
  }
  return found
}

function main(dirArg?: string) {
  const dir =
    dirArg ?? fileURLToPath(new URL("../src/migrations", import.meta.url))
  const found = findPublicQualifiers(dir)
  for (const { file, line } of found) {
    console.error(
      `${path.join(dir, file)}:${line}: "public". hardcodes a schema`
    )
  }
  if (found.length > 0) {
    console.error(
      'Migrations must work in any Site schema. Run "pnpm --filter site genericize <file>" on each file above.'
    )
    process.exit(1)
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv[2])
}
