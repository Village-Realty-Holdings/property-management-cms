import type { SiteFixtures } from "../../../src/site/fixtures"

/** The Blocks that show a Site's fixtures: its Rentals or its blog posts. */
export const FIXTURE_BLOCKS: readonly string[] = [
  "Featured rentals",
  "Large-group rentals",
  "Rental grid",
  "Blog teaser",
]

/**
 * Whether a run whose Site has `fixtures` writes the Block `name`'s preset
 * screenshot. A Block that shows fixtures is only its empty message on a
 * Site without any, which would replace the committed screenshot of the
 * Block with its Rentals or posts.
 */
export function keepsScreenshot(name: string, fixtures: SiteFixtures): boolean {
  const empty = fixtures.rentals.length === 0 && fixtures.posts.length === 0
  return !(empty && FIXTURE_BLOCKS.includes(name))
}
