import type { MetadataRoute } from "next"

import { getSiteSettings, listSitemapEntries } from "@workspace/content"

import { absoluteUrl } from "@/lib/seo"
import { requireSiteEnv } from "@/lib/site"

/**
 * /sitemap.xml: every published URL of this deployment's Site, absolute on
 * the Site's domain (https://<domain>). Cached with the content it lists, so
 * the CMS's revalidation refreshes it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await requireSiteEnv()
  const [settings, entries] = await Promise.all([
    getSiteSettings(),
    listSitemapEntries(),
  ])
  return entries.map((entry) => ({
    url: absoluteUrl(settings, entry.path),
    ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
    ...(entry.path === "/" ? { priority: 1 } : {}),
  }))
}
