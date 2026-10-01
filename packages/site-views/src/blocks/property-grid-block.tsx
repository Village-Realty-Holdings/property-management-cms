import Link from "next/link"

import type { PropertySummary } from "@workspace/content/queries"

import { PropertyGrid } from "../site/property-grid"
import { SectionHeading } from "../site/section-heading"

import {
  curatedListHref,
  curatedListOf,
  limitOf,
  locationHref,
  locationOf,
  locationPathFrom,
  str,
} from "./lib"
import { container, type BlockRendererProps } from "./types"

type Members = {
  properties: PropertySummary[]
  /** Where "See all" goes, with its label. */
  more: { href: string; label: string } | null
  /** The source's name, when the Block has no heading. */
  title: string
}

/** The grid's Properties, resolved at read time from its source. */
async function membersOf(
  { block, context }: BlockRendererProps,
  limit: number
): Promise<Members | null> {
  if (block.source === "location") {
    const location = locationOf(block.location)
    if (!location) return null
    const results = await context.content.searchProperties({
      locationId: location.id,
      limit,
      sort: "featured",
    })
    const path = locationPathFrom(
      location.slug,
      results.docs.map((p) => p.location?.path)
    )
    return {
      properties: results.docs,
      more:
        path && results.totalDocs > results.docs.length
          ? {
              href: locationHref(path),
              label: `See all ${results.totalDocs} in ${location.name}`,
            }
          : path
            ? { href: locationHref(path), label: `Explore ${location.name}` }
            : null,
      title: `Stays in ${location.name}`,
    }
  }
  const ref = curatedListOf(block.curatedList)
  if (!ref) return null
  const list = await context.content.getCuratedList(ref.slug)
  if (!list) return null
  const total = list.properties.length
  return {
    properties: list.properties.slice(0, limit),
    more: {
      href: curatedListHref(list.slug),
      label: total > limit ? `See all ${total}` : "See the list",
    },
    title: list.title,
  }
}

/**
 * Property Grid: Properties from a Curated List or a Location (and the
 * Locations inside it), up to the Block's limit, with a link to the rest.
 */
export async function PropertyGridBlock({
  block,
  context,
}: BlockRendererProps) {
  const members = await membersOf({ block, context }, limitOf(block.limit))
  if (!members) return null
  const id = `block-${context.index}-heading`
  return (
    <section
      aria-labelledby={id}
      className={`${container} flex flex-col gap-10 py-16 sm:py-20`}
    >
      <SectionHeading
        id={id}
        title={str(block.heading) ?? members.title}
        action={
          members.more &&
          members.properties.length > 0 && (
            <Link
              href={members.more.href}
              className="inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold text-primary underline decoration-(--brand-accent) decoration-2 underline-offset-4 hover:decoration-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {members.more.label}
            </Link>
          )
        }
      />
      <PropertyGrid
        properties={members.properties}
        preloadCount={context.index <= 1 ? 3 : 0}
        empty={{
          title: "No rentals here yet",
          description: "New homes are on the way. Check back soon.",
        }}
      />
    </section>
  )
}
