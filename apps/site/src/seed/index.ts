import type { Payload } from "payload"

import type { FetchLike } from "../fonts/googleFonts"
import { ensureStarterTemplates } from "../pageTemplates/starters"
import { seed as avada } from "./avada"
import { seed as beachside } from "./beachside"
import { createSeeder, seedStaffUser, type Seeder } from "./upsert"
import { seed as warrenBeach } from "./warren_beach"

export { createSeeder, sameData, seedStaffUser } from "./upsert"
export type { Seeder, SeedUser, Upserted } from "./upsert"

/** A Site's seed: what it creates, through the helpers of `seed`. */
export type SeedModule = (seed: Seeder) => Promise<void>

/** The Site seeds, by the schema (`DATABASE_SCHEMA`) each Site lives in. */
export const SEED_MODULES: Readonly<Record<string, SeedModule>> = {
  warren_beach: warrenBeach,
  avada,
  beachside,
}

export function seedModuleFor(schema: string | undefined): SeedModule {
  const found = schema ? SEED_MODULES[schema] : undefined
  if (!found) {
    throw new Error(
      `There is no seed for schema ${JSON.stringify(schema ?? "public")}. Seeds exist for: ${Object.keys(SEED_MODULES).join(", ")}.`
    )
  }
  return found
}

/**
 * Runs a seed against a migrated database as the seed Staff User, and returns
 * what it did, record by record. Every Site also gets the starter Page
 * Templates it doesn't have. Running it again changes nothing.
 */
export async function runSeed(
  payload: Payload,
  { module, fetch }: { module: SeedModule; fetch?: FetchLike }
): Promise<Seeder["report"]> {
  const seeder = createSeeder(payload, await seedStaffUser(payload), { fetch })
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
