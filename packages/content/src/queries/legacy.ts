import { legacyUrlSettingsFrom, type LegacyUrlSettings } from "../shared"
import type { SiteDoc } from "./docs"
import type { QueryContext } from "./context"

/**
 * The small reads behind apps/site's proxy (../../proxy.ts): just what a
 * legacy URL redirect needs, so a cache miss stays one cheap request.
 */

/** The Site's Legacy URLs tab. Throws when the reader key can't read SITE. */
export async function getLegacyUrls(
  ctx: QueryContext
): Promise<LegacyUrlSettings> {
  const { docs } = await ctx.client.find<SiteDoc>("sites", {
    where: { slug: { equals: ctx.site } },
    select: { slug: true, legacyUrls: true },
    depth: 0,
    limit: 1,
  })
  const site = docs[0]
  if (!site || site.slug !== ctx.site) {
    throw new Error(
      `Site "${ctx.site}" not found: check SITE and that CMS_READER_KEY belongs to that Site`
    )
  }
  return legacyUrlSettingsFrom(site.legacyUrls)
}

/**
 * Whether a root-level legacy URL (/{slug}) is a Property's: an Active
 * Property has that slug and no published Page owns the path.
 */
export async function isLegacyPropertySlug(
  ctx: QueryContext,
  slug: string
): Promise<boolean> {
  if (!slug) return false
  const [properties, pages] = await Promise.all([
    ctx.client.find("properties", {
      where: {
        and: [{ slug: { equals: slug } }, { status: { equals: "active" } }],
      },
      select: { slug: true },
      depth: 0,
      limit: 1,
    }),
    ctx.client.find("pages", {
      where: { path: { equals: `/${slug}` } },
      select: { path: true },
      depth: 0,
      limit: 1,
    }),
  ])
  return properties.docs.length > 0 && pages.docs.length === 0
}
