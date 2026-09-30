import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { entryBySlug } from "@/blocks/catalogue"
import { siteSchema } from "@/database"
import { Block } from "@/site/blocks"
import { sampleWithQuery, type Query } from "@/site/dev/blockCatalogue"
import { devOnly } from "@/site/dev/devOnly"
import { fixturesFor } from "@/site/fixtures"

export const metadata: Metadata = {
  title: "Block catalogue",
  robots: { index: false, follow: false },
}

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Query>
}

/**
 * One Block of the catalogue, outside production only (404 in production):
 * the same component a published Page uses, from the Block's sample data, in
 * the Site's Theme, in a <main> like a Page's. The query sets what it shows:
 * `?background=`, `?variant=`, any sample field (`?count=3`), and
 * `?fixtures=<schema>` to read another Site's fixtures instead of this one's.
 */
export default async function BlockCataloguePage({
  params,
  searchParams,
}: Props) {
  devOnly()
  const { slug } = await params
  const entry = entryBySlug(slug)
  if (!entry) notFound()
  const query = await searchParams
  const schema = Array.isArray(query.fixtures)
    ? query.fixtures[0]
    : query.fixtures
  return (
    <main>
      <Block
        block={sampleWithQuery(entry, query)}
        index={0}
        fixtures={fixturesFor(schema ?? siteSchema())}
      />
    </main>
  )
}
