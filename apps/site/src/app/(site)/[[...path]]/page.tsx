import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { siteSchema } from "@/database"
import { resolveBrand } from "@/site/brand"
import { Blocks } from "@/site/blocks"
import { LayoutFrame } from "@/site/LayoutFrame"
import { fixturesFor } from "@/site/fixtures"
import {
  getBrand,
  getLayoutForPath,
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

/**
 * A Published Page at its path; "/" is Home. It renders inside the Layout it
 * resolves to: the one it picks, none, the longest path prefix's, or the
 * default (apps/site ADR-0006).
 */
export default async function SitePage(props: Props) {
  const { path } = await props.params
  const page = await getPublishedPage(pathFromSegments(path))
  if (!page) notFound()
  const [layout, brand] = await Promise.all([
    getLayoutForPath(page.path),
    getBrand(),
  ])
  // Blocks render from the Page and the Site's fixtures, nothing fetched.
  const fixtures = fixturesFor(siteSchema())
  return (
    <LayoutFrame
      layout={layout}
      brand={resolveBrand(brand)}
      fixtures={fixtures}
    >
      <Blocks blocks={page.blocks} fixtures={fixtures} />
    </LayoutFrame>
  )
}
