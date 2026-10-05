import { readdirSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"

import type { Payload } from "payload"

import type { FetchLike } from "../fonts/googleFonts"
import { ensureStarterTemplates } from "../pageTemplates/starters"
import { createSeeder, seedUser, type Seeder } from "./upsert"

export { createSeeder, sameData, seedUser } from "./upsert"
export type { Seeder, SeedUser, Upserted } from "./upsert"

/** A Site's seed: what it creates, through the helpers of `seed`. */
export type SeedModule = (seed: Seeder) => Promise<void>

const SEED_DIR = fileURLToPath(new URL(".", import.meta.url))

/** Files in this folder that are not a Site's seed. */
const NOT_SEEDS = new Set(["index", "upsert"])

/**
 * The schemas (`DATABASE_SCHEMA`) that have a seed, in order. A Site's seed is
 * found by its file, src/seed/<schema>.ts exporting `seed`, so a Site's fork
 * adds its seed without editing this one.
 */
export function seedSchemas(): string[] {
  return readdirSync(SEED_DIR)
    .filter((file) => /^[a-z0-9_]+\.ts$/.test(file))
    .map((file) => file.slice(0, -".ts".length))
    .filter((schema) => !NOT_SEEDS.has(schema))
    .sort()
}

export async function seedModuleFor(
  schema: string | undefined
): Promise<SeedModule> {
  if (!schema || !seedSchemas().includes(schema)) {
    throw new Error(
      `There is no seed for schema ${JSON.stringify(schema ?? "public")}. Seeds exist for: ${seedSchemas().join(", ")}.`
    )
  }
  const imported = (await import(
    pathToFileURL(`${SEED_DIR}${schema}.ts`).href
  )) as { seed?: SeedModule }
  if (typeof imported.seed !== "function") {
    throw new Error(`src/seed/${schema}.ts does not export a seed.`)
  }
  return imported.seed
}

/**
 * Runs a seed against a migrated database as the seed User, and returns
 * what it did, record by record. Every Site also gets the starter Page
 * Templates it doesn't have. Running it again changes nothing.
 */
export async function runSeed(
  payload: Payload,
  { module, fetch }: { module: SeedModule; fetch?: FetchLike }
): Promise<Seeder["report"]> {
  const seeder = createSeeder(payload, await seedUser(payload), { fetch })
  await module(seeder)
  const starters = await ensureStarterTemplates(payload, {
    overrideAccess: false,
    user: seeder.user,
  })
  for (const { path, action } of starters) {
    seeder.report.push({ kind: "page template", key: path, action })
  }
  return seeder.report
}
