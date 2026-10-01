import Link from "next/link"

import type { CuratedListPage } from "@workspace/content/queries"
import { cn } from "@workspace/ui/lib/utils"

import { displayFont } from "../site/display"
import { FeedImage } from "../site/feed-image"
import { SectionHeading } from "../site/section-heading"

import { curatedListHref, curatedListsOf, str } from "./lib"
import { container, type BlockRendererProps } from "./types"

function ListCard({ list, wide }: { list: CuratedListPage; wide: boolean }) {
  const count = list.properties.length
  const image = list.heroImage ?? list.properties[0]?.image ?? null
  return (
    <article className="group relative isolate h-full overflow-hidden rounded-xl bg-(--brand-primary) text-white">
      <FeedImage
        image={image}
        alt=""
        sizes={
          wide
            ? "(min-width: 1280px) 800px, (min-width: 1024px) 66vw, 100vw"
            : "(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        }
        className="aspect-auto h-full min-h-80 transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-5 sm:p-6">
        <h3
          className={cn(
            displayFont,
            "leading-tight text-balance",
            wide ? "text-3xl sm:text-4xl" : "text-2xl"
          )}
        >
          <Link
            href={curatedListHref(list.slug)}
            className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-(--brand-accent) focus-visible:after:ring-inset"
          >
            {list.title}
          </Link>
        </h3>
        {list.description && (
          <p className="line-clamp-2 max-w-xl text-sm text-white/85 sm:text-base">
            {list.description}
          </p>
        )}
        <p className="text-sm font-semibold text-(--brand-accent)">
          {count === 0
            ? "New homes coming soon"
            : `${count} ${count === 1 ? "home" : "homes"}`}
        </p>
      </div>
    </article>
  )
}

/**
 * Curated List Cards: photo cards linking to Curated Lists, in the order
 * chosen. The first card spans two columns on large screens when it helps
 * fill the row.
 */
export async function CuratedListCardsBlock({
  block,
  context,
}: BlockRendererProps) {
  const refs = curatedListsOf(block.lists)
  const lists = (
    await Promise.all(
      refs.map((ref) => context.content.getCuratedList(ref.slug))
    )
  ).filter((list): list is CuratedListPage => list !== null)
  if (lists.length === 0) return null
  const id = `block-${context.index}-heading`
  const heading = str(block.heading)
  // Rows of two for 2 or 4 lists; rows of three otherwise, the first list
  // leading two columns wide when that fills the last row.
  const threeUp = lists.length > 2 && lists.length !== 4
  const leadWide = threeUp && lists.length % 3 === 2
  return (
    <section
      aria-labelledby={heading ? id : undefined}
      aria-label={heading ? undefined : "Curated lists"}
      className={`${container} flex flex-col gap-10 py-16 sm:py-20`}
    >
      {heading && <SectionHeading id={id} title={heading} />}
      <ul
        className={cn(
          "grid grid-cols-1 gap-5 sm:grid-cols-2",
          threeUp && "lg:grid-cols-3"
        )}
      >
        {lists.map((list, i) => {
          const wide = leadWide && i === 0
          return (
            <li key={list.id} className={cn(wide && "lg:col-span-2")}>
              <ListCard list={list} wide={wide} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
