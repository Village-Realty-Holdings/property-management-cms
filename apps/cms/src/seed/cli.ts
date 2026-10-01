// `pnpm seed`: loads apps/cms/.env before the config reads the environment.
import "dotenv/config"

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { getPayload } from "payload"

import config from "../payload.config"
import { seed, siteEnvLines, type SeedOutput } from "./index"

const outputFile = fileURLToPath(
  new URL("../../.seed-output.json", import.meta.url)
)

function readPrevious(): SeedOutput | undefined {
  if (!existsSync(outputFile)) return undefined
  try {
    return JSON.parse(readFileSync(outputFile, "utf8")) as SeedOutput
  } catch {
    return undefined
  }
}

async function main() {
  const payload = await getPayload({ config })
  try {
    const { output, synced, editorial } = await seed(payload, {
      previous: readPrevious(),
    })
    writeFileSync(outputFile, `${JSON.stringify(output, null, 2)}\n`)

    console.log(`\nSeeded (Sync ${synced ? "ran" : "skipped"}):`)
    for (const [slug, report] of Object.entries(editorial)) {
      // Skipped items are logged as warnings by seedEditorial.
      const { skipped, ...counts } = report
      console.log(
        `  ${slug}: ${JSON.stringify(counts)}, ${skipped.length} skipped`
      )
    }
    console.log(`\nWrote ${outputFile}`)
    for (const [slug, site] of Object.entries(output.sites)) {
      console.log(
        `\n# apps/site/.env.local for ${slug} (${site.deploymentUrl})`
      )
      console.log(siteEnvLines(slug, site))
    }
  } finally {
    await payload.destroy()
  }
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error)
    process.exit(1)
  }
)
