import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Blocks } from "@/site/blocks"
import { getPublishedPage, pathFromSegments } from "@/site/queries"

type Props = { params: Promise<{ path?: string[] }> }

async function pageFor({ params }: Props) {
  const { path } = await params
  return getPublishedPage(pathFromSegments(path))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const page = await pageFor(props)
  if (!page) return {}
  const image =
    page.seo?.image && typeof page.seo.image === "object"
      ? page.seo.image.url
      : null
  return {
    title: page.seo?.title || page.title,
    description: page.seo?.description || undefined,
    openGraph: image ? { images: [image] } : undefined,
  }
}

/** A Published Page at its path; "/" is Home. */
export default async function SitePage(props: Props) {
  const page = await pageFor(props)
  if (!page) notFound()
  return <Blocks blocks={page.layout} />
}
