import Image from "next/image"
import Link from "next/link"

import type { ContentAdapter, LocationRef } from "@workspace/content/queries"
import { cn } from "@workspace/ui/lib/utils"

import { displayFont } from "../site/display"

import { BlockButton } from "./block-link"
import { imageOf, linkOf, locationHref, str } from "./lib"
import { container, type BlockRendererProps } from "./types"

const listFormat = new Intl.ListFormat("en", { type: "conjunction" })

/** Distinct Locations of the listed Properties, in order of first appearance. */
function distinctLocations(locations: (LocationRef | null)[]): LocationRef[] {
  const seen = new Map<string, LocationRef>()
  for (const location of locations) {
    if (location && !seen.has(location.id)) seen.set(location.id, location)
  }
  return [...seen.values()]
}

/** The Site's rental count and places, shown under Home's opening Hero. */
async function SiteAtAGlance({
  onImage,
  content,
}: {
  onImage: boolean
  content: ContentAdapter
}) {
  const results = await content.searchProperties({ limit: 24 })
  const places = distinctLocations(results.docs.map((p) => p.location))
  const count = results.totalDocs
  if (count === 0) return null
  return (
    <div className="flex flex-col gap-4">
      <p className="text-base opacity-85 sm:text-lg">
        {count} {count === 1 ? "rental" : "rentals"}
        {places.length > 0 &&
          ` in ${listFormat.format(places.slice(0, 3).map((l) => l.name))}`}
        .
      </p>
      {places.length > 1 && (
        <nav aria-label="Places">
          <ul className="flex flex-wrap gap-2">
            {places.slice(0, 6).map((place) => (
              <li key={place.id}>
                <Link
                  href={locationHref(place.path)}
                  className={cn(
                    "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-current/40 focus-visible:outline-none",
                    onImage
                      ? "border-white/40 bg-black/20 backdrop-blur-sm hover:border-white hover:bg-black/35"
                      : "border-current/30 hover:border-current hover:bg-current/10"
                  )}
                >
                  {place.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}

/**
 * Hero: the Page's opening statement. With an image it's a full-bleed photo
 * with the heading over a shade; without, the Site's primary colour with an
 * accent glow. Home's first Hero also lists the Site's rentals and places.
 */
export async function HeroBlock({ block, context }: BlockRendererProps) {
  const heading = str(block.heading)
  if (!heading) return null
  const subheading = str(block.subheading)
  const cta = linkOf(block.cta)
  const image = imageOf(block.image, context.mediaBaseUrl)
  const first = context.index === 0
  const Heading = first ? "h1" : "h2"
  const id = `block-${context.index}-heading`
  const glance = context.isHome && first

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "relative isolate overflow-hidden",
        image
          ? "bg-neutral-900 text-white"
          : "bg-(--brand-primary) text-(--brand-primary-foreground)"
      )}
    >
      {image ? (
        <>
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="100vw"
            preload={first}
            className="-z-20 object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-linear-to-t from-black/80 via-black/45 to-black/10"
          />
        </>
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-40 -z-10 size-[28rem] rounded-full bg-(--brand-accent) opacity-20 blur-3xl sm:size-[40rem]"
        />
      )}
      <div
        className={cn(
          container,
          "flex flex-col gap-8",
          image
            ? "min-h-[34rem] justify-end pt-32 pb-14 sm:min-h-[40rem] sm:pb-20"
            : "pt-16 pb-14 sm:pt-24 sm:pb-20"
        )}
      >
        <Heading
          id={id}
          className={cn(
            displayFont,
            first ? "text-5xl sm:text-7xl lg:text-8xl" : "text-4xl sm:text-6xl",
            // After the sizes: tailwind-merge drops a leading-* that precedes a text-* size.
            "max-w-5xl leading-[0.95] text-balance"
          )}
        >
          {heading}
        </Heading>
        {subheading && (
          <p className="max-w-2xl text-xl text-pretty whitespace-pre-line sm:text-2xl">
            {subheading}
          </p>
        )}
        {glance && (
          <SiteAtAGlance onImage={!!image} content={context.content} />
        )}
        {cta && (
          <div>
            <BlockButton link={cta} tone="accent" />
          </div>
        )}
      </div>
    </section>
  )
}
