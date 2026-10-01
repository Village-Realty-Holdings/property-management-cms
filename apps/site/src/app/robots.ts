import type { MetadataRoute } from "next"
import { connection } from "next/server"

import { getSeo } from "@/site/queries"
import { resolveSeo, robotsFor, siteUrl } from "@/site/seo"

/** /robots.txt from SEO: allow, with the sitemap, or disallow everything. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  // Read on every request, so switching indexing takes effect at once.
  await connection()
  return robotsFor(resolveSeo(await getSeo()), siteUrl())
}
