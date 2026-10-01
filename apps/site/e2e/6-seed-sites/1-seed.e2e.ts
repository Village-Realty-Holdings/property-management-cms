import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { snapshotChanges, type Snapshot } from "./match"
import {
  cleanUpSites,
  filesSnapshot,
  mediaDir,
  migrationsRun,
  prepareSites,
  resetSites,
  schemaExists,
  schemaSnapshot,
  seed,
  tail,
  type RunningSite,
} from "./support/scratch"
import { SITES } from "./support/sites"

/**
 * Phase 6 acceptance: the seeds. `pnpm site <slug> seed` creates the Site's
 * schema, migrates it and fills it (Brand, SEO, Theme, Fonts, Media,
 * Layouts, Pages, Navigation), and a second run is a no-op: nothing is added,
 * duplicated or rewritten, in the database or in the Site's Media folder.
 *
 * The seeds run from each Site's scratch worktree (see support/env.ts)
 * against the scratch database. What the seeded Sites show is checked in
 * 2-sites.e2e.ts; this file only checks what the seeds store.
 */

let sites: RunningSite[] = []

/** Everything a Site has stored: its schema and its Media folder. */
async function stored(site: RunningSite): Promise<Snapshot> {
  const files = Object.fromEntries(
    Object.entries(filesSnapshot(mediaDir(site))).map(([file, size]) => [
      `media/${file} bytes`,
      size,
    ])
  )
  return { ...(await schemaSnapshot(site.schema)), ...files }
}

beforeAll(async () => {
  sites = await prepareSites()
  // From nothing: no schema, no Media.
  await resetSites(sites)
}, 1_800_000)

afterAll(async () => {
  await cleanUpSites(sites)
}, 300_000)

describe("a first seed run", () => {
  it("names each Site's own schema in its env file", () => {
    expect(sites.map((site) => site.schema)).toEqual(
      SITES.map((site) => site.schema)
    )
  })

  it.each(SITES.map((spec) => [spec.name, spec.slug] as const))(
    "creates, migrates and fills %s from nothing, and leaves the other Sites alone",
    async (_name, slug) => {
      const site = sites.find((candidate) => candidate.slug === slug)!
      const others = sites.filter((candidate) => candidate !== site)
      const othersBefore = await Promise.all(others.map(stored))

      const result = await seed(site)
      expect(result.code, tail(result)).toBe(0)

      // It creates its schema and migrates it.
      expect(await schemaExists(site.schema)).toBe(true)
      expect(await migrationsRun(site.schema)).toBeGreaterThan(0)
      // It stores content, and its Media (the logo and photos) and Font
      // files go to this Site's own folder.
      const snapshot = await schemaSnapshot(site.schema)
      const rows = Object.entries(snapshot)
        .filter(([key]) => key.endsWith(" rows"))
        .reduce((sum, [, count]) => sum + Number(count), 0)
      expect(rows).toBeGreaterThan(0)
      expect(Object.keys(filesSnapshot(mediaDir(site))).length).toBeGreaterThan(
        0
      )

      // Seeding one Site never touches another's schema or Media.
      const othersAfter = await Promise.all(others.map(stored))
      others.forEach((other, index) => {
        expect(
          snapshotChanges(othersBefore[index]!, othersAfter[index]!),
          `${other.slug} changed while ${site.slug} was seeded`
        ).toEqual([])
      })
    }
  )
})

describe("a second seed run", () => {
  it.each(SITES.map((spec) => [spec.name, spec.slug] as const))(
    "is a no-op for %s: nothing added, duplicated or rewritten",
    async (_name, slug) => {
      const site = sites.find((candidate) => candidate.slug === slug)!
      const before = await stored(site)
      expect(
        Object.keys(before).length,
        "the first run stored something"
      ).toBeGreaterThan(0)

      const result = await seed(site)
      expect(result.code, tail(result)).toBe(0)

      expect(snapshotChanges(before, await stored(site))).toEqual([])
    }
  )

  it("stays a no-op on a third run, for every Site at once", async () => {
    const before = await Promise.all(sites.map(stored))
    const results = await Promise.all(sites.map(seed))
    results.forEach((result, index) => {
      expect(result.code, `${sites[index]!.slug}: ${tail(result)}`).toBe(0)
    })
    const after = await Promise.all(sites.map(stored))
    sites.forEach((site, index) => {
      expect(
        snapshotChanges(before[index]!, after[index]!),
        `${site.slug} changed`
      ).toEqual([])
    })
  })
})
