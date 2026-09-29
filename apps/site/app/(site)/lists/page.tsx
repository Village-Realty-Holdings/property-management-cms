import type { Metadata } from "next"
import Link from "next/link"
import { LayersIcon } from "lucide-react"

import { getCuratedList, getPage, getSiteSettings } from "@workspace/content"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { Breadcrumbs } from "@workspace/site-views/site/breadcrumbs"
import { displayFont } from "@workspace/site-views/site/display"
import { EmptyState } from "@workspace/site-views/site/empty-state"
import { FeedImage } from "@workspace/site-views/site/feed-image"
import { hasSite, requireSiteEnv } from "@/lib/site"

export async function generateMetadata(): Promise<Metadata> {
  const description = hasSite()
    ? `Hand-picked collections of vacation rentals from ${(await getSiteSettings()).name}.`
    : undefined
  return {
    title: "Collections",
    description,
    alternates: { canonical: "/lists" },
  }
}

/** Most Curated Lists this page shows. */
const MAX_LISTS = 24

/**
 * The Site's Curated List slugs. Content has no "all Curated Lists" read,
 * so these are the lists the Home Page features in its Curated List Cards
 * Blocks, in their order.
 */
async function featuredListSlugs(): Promise<string[]> {
  const home = await getPage([])
  const slugs = new Set<string>()
  for (const block of home?.blocks ?? []) {
    if (block.blockType !== "curatedListCards") continue
    const lists = Array.isArray(block.lists) ? block.lists : []
    for (const list of lists) {
      const slug = (list as { slug?: unknown } | null)?.slug
      if (typeof slug === "string" && slug) slugs.add(slug)
    }
  }
  return [...slugs].slice(0, MAX_LISTS)
}

export default async function ListsPage() {
  await requireSiteEnv()
  const slugs = await featuredListSlugs()
  const lists = (await Promise.all(slugs.map(getCuratedList))).filter(
    (list) => list !== null
  )

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 pt-8 pb-20 sm:px-6 sm:pt-10 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-border pb-8">
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "Collections" }]}
        />
        <h1
          className={cn(
            displayFont,
            "text-5xl leading-[0.95] text-balance sm:text-6xl"
          )}
        >
          Collections
        </h1>
        <p className="max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
          Homes we&apos;ve grouped for the way you like to travel.
        </p>
      </header>

      {lists.length === 0 ? (
        <EmptyState
          icon={LayersIcon}
          title="No collections yet"
          description="Browse every home instead, and filter by what matters to you."
          action={
            <Link href="/rentals" className={buttonVariants()}>
              Browse all rentals
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list, i) => {
            const count = list.properties.length
            return (
              <li key={list.id}>
                <article className="group relative flex flex-col gap-4">
                  <FeedImage
                    image={list.heroImage ?? list.properties[0]?.image ?? null}
                    alt=""
                    aspect="3/2"
                    preload={i < 3}
                    sizes="(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="rounded-xl transition-[filter] duration-300 group-hover:brightness-95"
                  />
                  <div className="flex flex-col gap-1.5">
                    <h2
                      className={cn(
                        displayFont,
                        "text-2xl leading-tight text-balance"
                      )}
                    >
                      <Link
                        href={`/lists/${list.slug}`}
                        className="decoration-(--brand-accent) decoration-2 underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/60"
                      >
                        {list.title}
                      </Link>
                    </h2>
                    {list.description && (
                      <p className="line-clamp-2 text-sm text-pretty text-muted-foreground">
                        {list.description}
                      </p>
                    )}
                    <p className="text-sm font-medium">
                      {count === 0
                        ? "No homes right now"
                        : `${count} ${count === 1 ? "home" : "homes"}`}
                    </p>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
