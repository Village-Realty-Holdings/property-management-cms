import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { content, getGuide, listGuides } from "@workspace/content"
import { GuideView } from "@workspace/site-views"

import { hasSite, requireSiteEnv } from "@/lib/site"

type Params = Promise<{ slug: string }>

/**
 * The Site's Guides, prerendered at build. Cache Components needs at least
 * one param; without SITE (a CI build) or Guides, a placeholder 404s.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const placeholder = [{ slug: "__placeholder__" }]
  if (!hasSite()) return placeholder
  const { docs } = await listGuides({ limit: 100 })
  const slugs = docs.filter((g) => g.slug).map((g) => ({ slug: g.slug }))
  return slugs.length > 0 ? slugs : placeholder
}

export async function generateMetadata({
  params,
}: {
  params: Params
}): Promise<Metadata> {
  if (!hasSite()) return {}
  const guide = await getGuide((await params).slug)
  if (!guide) return {}
  const description = guide.seo.description ?? guide.excerpt ?? undefined
  const image = guide.seo.image ?? guide.heroImage
  return {
    title: guide.seo.title ?? guide.title,
    description,
    openGraph: {
      type: "article",
      title: guide.seo.title ?? guide.title,
      description,
      publishedTime: guide.publishedAt ?? undefined,
      images: image ? [{ url: image.url, alt: image.alt }] : undefined,
    },
  }
}

export default async function GuidePage({ params }: { params: Params }) {
  await requireSiteEnv()
  const guide = await getGuide((await params).slug)
  if (!guide) notFound()
  return <GuideView guide={guide} content={content} />
}
