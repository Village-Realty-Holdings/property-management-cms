import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { siteSchema } from "@/database"
import { resolveBrand } from "@/site/brand"
import { Blocks } from "@/site/blocks"
import { EditingPage, editingMetadata } from "@/site/editing/EditingPage"
import { isEditingCanvasRequest } from "@/site/editing/request"
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

type Props = {
  params: Promise<{ path?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function pageFor({ params }: Props) {
  const { path } = await params
  return getPublishedPage(pathFromSegments(path))
}

/** The Page's own SEO over the Site's defaults from the SEO global. */
export async function generateMetadata(props: Props): Promise<Metadata> {
  if (await isEditingCanvasRequest(await props.searchParams)) {
    return editingMetadata
  }
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
 * default (apps/site ADR-0006). With the editing flag and a User's
 * session it is the Visual Editor's canvas instead, which shows whatever the
 * Admin posts to it, not this path's Page.
 */
export default async function SitePage(props: Props) {
  // Only for a signed-in User; the flag is ignored for anyone else.
  if (await isEditingCanvasRequest(await props.searchParams)) {
    return <EditingPage searchParams={await props.searchParams} />
  }
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
