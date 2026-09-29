import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { content, getCuratedList } from "@workspace/content"
import { CuratedListView } from "@workspace/site-views"

import { hasSite, requireSiteEnv } from "@/lib/site"

/**
 * Known params keep `params` out of runtime data, so the page resolves the
 * list before the response starts and an unknown slug gets a real 404. Lists
 * render on first request; the placeholder only satisfies the build.
 */
export function generateStaticParams(): { slug: string }[] {
  return [{ slug: "__placeholder__" }]
}

export async function generateMetadata({
  params,
}: PageProps<"/lists/[slug]">): Promise<Metadata> {
  if (!hasSite()) return {}
  const { slug } = await params
  const list = await getCuratedList(slug)
  if (!list) return { title: "List not found" }
  const image = list.seo.image ?? list.heroImage
  const description = list.seo.description ?? list.description ?? undefined
  return {
    title: list.seo.title ?? list.title,
    description,
    alternates: { canonical: `/lists/${list.slug}` },
    openGraph: {
      title: list.seo.title ?? list.title,
      description,
      ...(image && { images: [{ url: image.url, alt: image.alt }] }),
    },
  }
}

/**
 * A Curated List: its hero, intro and member Properties. Not behind its own
 * <Suspense>: an unknown slug must reach notFound() before the response
 * starts streaming, so it gets a real 404.
 */
export default async function CuratedListPage({
  params,
}: PageProps<"/lists/[slug]">) {
  await requireSiteEnv()
  const { slug } = await params
  const list = await getCuratedList(slug)
  if (!list) notFound()
  return <CuratedListView list={list} content={content} />
}
