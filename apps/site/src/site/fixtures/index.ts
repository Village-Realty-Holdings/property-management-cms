import { fixtures as avada } from "./avada"
import { fixtures as beachside } from "./beachside"
import type { SiteFixtures } from "./types"
import { fixtures as warrenBeach } from "./warren_beach"

export type { BlogPost, FixtureImage, Rental, SiteFixtures } from "./types"

/** The fixture modules, by the schema of the Site they belong to. */
const modules = new Map<string, SiteFixtures>([
  ["warren_beach", warrenBeach],
  ["avada", avada],
  ["beachside", beachside],
])

/**
 * The Rentals and blog posts of the Site whose Postgres schema is `schema`
 * (src/site/fixtures/<schema>.ts). A schema with no module, or none at all,
 * gets empty fixtures, so the Blocks show their friendly empty message.
 */
export function fixturesFor(schema: string | null | undefined): SiteFixtures {
  return (schema && modules.get(schema)) || { rentals: [], posts: [] }
}
