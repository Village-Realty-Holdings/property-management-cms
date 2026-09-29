import type { MetadataRoute } from "next"

import { getSiteSettings } from "@workspace/content"

import { absoluteUrl, siteOrigin } from "@/lib/seo"
import { requireSiteEnv } from "@/lib/site"

/** /robots.txt: crawl everything but the API; points at the sitemap. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  await requireSiteEnv()
  const settings = await getSiteSettings()
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: absoluteUrl(settings, "/sitemap.xml"),
    host: siteOrigin(settings),
  }
}
