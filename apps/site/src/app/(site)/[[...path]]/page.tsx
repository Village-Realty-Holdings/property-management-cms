import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { siteSchema } from "@/database"
import { resolveBrand } from "@/site/brand"
import { Blocks } from "@/site/blocks"
import { fixturesFor } from "@/site/fixtures"
import {
  getBrand,
  getPublishedPage,
  getSeo,
  pathFromSegments,
} from "@/site/queries"
import { pageMetadata, resolveSeo, siteUrl } from "@/site/seo"

type Props = { params: Promise<{ path?: string[] }> }

async function pageFor({ params }: Props) {
  const { path } = await params
  return getPublishedPage(pathFromSegments(path))
}

/** The Page's own SEO over the Site's defaults from the SEO global. */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const page = await pageFor(props)
  if (!page) return {}
  const [brand, seo] = await Promise.all([getBrand(), getSeo()])
  return pageMetadata({
    page,
    brand: resolveBrand(brand),
    seo: resolveSeo(seo),
    baseUrl: siteUrl(),
  })
}

/** A Published Page at its path; "/" is Home. */
export default async function SitePage(props: Props) {
  const page = await pageFor(props)
  if (!page) notFound()
  // Blocks render from the Page and the Site's fixtures, nothing fetched.
  return <Blocks blocks={page.blocks} fixtures={fixturesFor(siteSchema())} />
}
