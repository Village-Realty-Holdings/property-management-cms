import type { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  content,
  getPage,
  getSiteSettings,
  type PageDoc,
} from "@workspace/content"
import { PageView } from "@workspace/site-views"

import { isReservedPath, segmentsOf } from "@workspace/site-views/blocks/lib"
import { hasSite, requireSiteEnv } from "@/lib/site"
import { currentYear } from "@/lib/year"

/**
 * CMS Pages, Home ("/") included, at their stored paths. The reserved
 * prefixes (/rentals, /areas, /lists, /guides, /specials, /api) belong to
 * other routes and never resolve here. A Page brings its own chrome: the
 * Site's usual header and footer, or the Tuck-In's for a Tuck-In Page.
 */

type Params = { path?: string[] }

/** The Page for the URL, or null (reserved prefixes never are Pages). */
async function pageFor(path: string[]): Promise<PageDoc | null> {
  if (isReservedPath(path)) return null
  return getPage(path)
}

/** Home and the Pages in the navigation; any other Page renders on first visit. */
export async function generateStaticParams(): Promise<Params[]> {
  const home: Params = { path: [] }
  if (!hasSite()) return [home]
  const { navigation } = await getSiteSettings()
  const pages = navigation
    .filter((link) => link.href.startsWith("/") && !link.href.startsWith("//"))
    .map((link) => segmentsOf(link.href))
    .filter((path) => path.length > 0 && !isReservedPath(path))
  return [home, ...pages.map((path) => ({ path }))]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  if (!hasSite()) return {}
  const path = (await params).path ?? []
  const page = await pageFor(path)
  if (!page) return {}
  const { seo } = page
  const isHome = path.length === 0
  const description = seo.description ?? undefined
  const image = seo.image
    ? [{ url: seo.image.url, alt: seo.image.alt || undefined }]
    : undefined
  return {
    // Home keeps the layout's "<Site>: <tagline>" unless its SEO title is set.
    ...(isHome
      ? seo.title
        ? { title: { absolute: seo.title } }
        : {}
      : { title: seo.title ?? page.title }),
    ...(description ? { description } : {}),
    openGraph: {
      ...(seo.title || !isHome ? { title: seo.title ?? page.title } : {}),
      ...(description ? { description } : {}),
      ...(image ? { images: image } : {}),
    },
  }
}

export default async function CmsPage({ params }: { params: Promise<Params> }) {
  const env = await requireSiteEnv()
  const path = (await params).path ?? []
  const page = await pageFor(path)
  if (!page) notFound()
  return (
    <PageView
      page={page}
      content={content}
      year={await currentYear()}
      mediaBaseUrl={env.cmsUrl}
    />
  )
}
