import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { BookOpenIcon } from "lucide-react"

import { getSiteSettings, listGuides } from "@workspace/content"
import { buttonVariants } from "@workspace/ui/components/button"

import { pageParam } from "@workspace/site-views/editorial/format"
import { GuideCard } from "@workspace/site-views/editorial/guide-card"
import { Pagination } from "@workspace/site-views/editorial/pagination"
import { Breadcrumbs } from "@workspace/site-views/site/breadcrumbs"
import { EmptyState } from "@workspace/site-views/site/empty-state"
import { SectionHeading } from "@workspace/site-views/site/section-heading"
import { hasSite, requireSiteEnv } from "@/lib/site"

const PAGE_SIZE = 12

export async function generateMetadata(): Promise<Metadata> {
  if (!hasSite()) return { title: "Guides" }
  const { name } = await getSiteSettings()
  return {
    title: "Guides",
    description: `Local know-how from ${name}: where to walk, eat and explore on your stay.`,
  }
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default function GuidesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <header className="flex flex-col gap-6">
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "Guides" }]}
        />
        <SectionHeading
          as="h1"
          title="Guides"
          description="Where to walk, eat and explore, from the people who live here."
        />
      </header>
      <Suspense fallback={<GuideListFallback />}>
        <GuideList searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function GuideList({ searchParams }: { searchParams: SearchParams }) {
  await requireSiteEnv()
  const page = pageParam((await searchParams).page)
  const guides = await listGuides({ page, limit: PAGE_SIZE })

  if (guides.docs.length === 0) {
    return page > 1 ? (
      <EmptyState
        icon={BookOpenIcon}
        title="There are no guides on this page"
        description="The list may have got shorter since the link was made."
        action={
          <Link href="/guides" className={buttonVariants({ size: "lg" })}>
            See the latest guides
          </Link>
        }
      />
    ) : (
      <EmptyState
        icon={BookOpenIcon}
        title="No guides yet"
        description="We're writing our first local guides. Check back soon."
      />
    )
  }

  const [lead, ...rest] = guides.docs
  const showLead = page === 1 && lead
  const grid = showLead ? rest : guides.docs

  return (
    <>
      {showLead && <GuideCard guide={lead} lead preload />}
      {grid.length > 0 && (
        <ul className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {grid.map((guide, i) => (
            <li key={guide.id} className="flex">
              <GuideCard
                guide={guide}
                preload={!showLead && i < 3}
                className="w-full"
              />
            </li>
          ))}
        </ul>
      )}
      <Pagination
        basePath="/guides"
        page={guides.page}
        totalPages={guides.totalPages}
        previousLabel="Newer guides"
        nextLabel="Older guides"
      />
    </>
  )
}

function GuideListFallback() {
  return (
    <div aria-hidden className="flex flex-col gap-12">
      <div className="aspect-video animate-pulse rounded-lg bg-muted motion-reduce:animate-none lg:aspect-[21/9]" />
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="aspect-3/2 animate-pulse rounded-lg bg-muted motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  )
}
