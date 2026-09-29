import type { Payload } from "payload"

import type { Site } from "@workspace/cms-types"

import { demoSites } from "./demo"
import { seedEditorial, type EditorialReport } from "./editorial"
import { runSync } from "./runSync"
import { seedAmenityFilters, seedEditor, seedReader, seedSite } from "./sites"

/** Written to apps/cms/.seed-output.json (gitignored) by `pnpm seed`. */
export type SeedOutput = {
  sites: Record<
    string,
    {
      id: number
      readerKey: string
      revalidationSecret: string
      deploymentUrl: string
    }
  >
}

export type SeedOptions = {
  /** An earlier run's output: its secrets are reused when the DB has none. */
  previous?: SeedOutput
  /** Run the Sync against the fake feed (when src/sync exists). @default true */
  sync?: boolean
}

export type SeedResult = {
  output: SeedOutput
  synced: boolean
  editorial: Record<string, EditorialReport>
}

/**
 * The editorial demo: two Sites with settings, a SiteReader each, a demo Editor, the Sync from the fake feed, then Pages,
 * Curated Lists, Guides and copy on synced Locations, Properties and Specials. Idempotent: everything
 * is created or updated by its natural key (Site slug, Page path, slug…).
 */
export async function seed(
  payload: Payload,
  { previous, sync = true }: SeedOptions = {}
): Promise<SeedResult> {
  const output: SeedOutput = { sites: {} }
  const sites: Site[] = []

  for (const spec of demoSites) {
    const known = previous?.sites[spec.slug] ?? {}
    const site = await seedSite(payload, spec, known)
    const { key: readerKey } = await seedReader(payload, site, known)
    sites.push(site)
    output.sites[spec.slug] = {
      id: site.id,
      readerKey,
      revalidationSecret: site.revalidationSecret ?? "",
      deploymentUrl: spec.deploymentUrl,
    }
  }
  const mountain = sites.find((site) => site.slug === "demo-mountain")
  if (mountain) await seedEditor(payload, mountain)

  const synced = sync ? await runSync(payload, sites) : false

  const editorial: Record<string, EditorialReport> = {}
  for (const [index, spec] of demoSites.entries()) {
    await seedAmenityFilters(payload, sites[index]!, spec)
    editorial[spec.slug] = await seedEditorial(payload, sites[index]!, spec)
  }
  return { output, synced, editorial }
}

/** Env lines for apps/site/.env.local, one Site deployment. */
export function siteEnvLines(
  slug: string,
  site: SeedOutput["sites"][string],
  cmsUrl = "http://localhost:3000"
): string {
  return [
    `SITE=${slug}`,
    `CMS_URL=${cmsUrl}`,
    `CMS_READER_KEY=${site.readerKey}`,
    `REVALIDATION_SECRET=${site.revalidationSecret}`,
  ].join("\n")
}
