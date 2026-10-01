import type { MetadataRoute } from "next"
import { connection } from "next/server"

import { getPublishedPages, getSeo } from "@/site/queries"
import { resolveSeo, siteUrl, sitemapFor } from "@/site/seo"

/** /sitemap.xml: every Published Page, unless indexing is off. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Read on every request, so a publish shows at once.
  await connection()
  const [seo, pages] = await Promise.all([getSeo(), getPublishedPages()])
  return sitemapFor(resolveSeo(seo), pages, siteUrl())
}
