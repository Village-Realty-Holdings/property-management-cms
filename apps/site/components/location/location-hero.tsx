import type { LocationPage } from "@workspace/content"
import { cn } from "@workspace/ui/lib/utils"

import { Breadcrumbs } from "@workspace/site-views/site/breadcrumbs"
import { displayFont } from "@workspace/site-views/site/display"
import { FeedImage } from "@workspace/site-views/site/feed-image"

import { locationCrumbs, placement } from "./location-links"

export type LocationHeroProps = {
  location: LocationPage
  /** Active Properties in the Location and the Locations inside it. */
  rentalCount: number
}

/**
 * The Location's name on the Site's primary colour, where it sits
 * ("Area in Park City"), how many rentals it holds, and its hero image
 * beside it when it has one. Breadcrumbs run above the band.
 */
export function LocationHero({ location, rentalCount }: LocationHeroProps) {
  const where = placement(location)
  const image = location.heroImage
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={locationCrumbs(location)} />
      </div>
      <section
        aria-labelledby="location-name"
        className="relative overflow-hidden bg-(--brand-primary) text-(--brand-primary-foreground)"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-48 -left-32 size-[26rem] rounded-full bg-(--brand-accent) opacity-15 blur-3xl sm:size-[36rem]"
        />
        <div
          className={cn(
            "relative mx-auto grid max-w-7xl items-end gap-10 px-4 pt-12 pb-12 sm:px-6 sm:pt-16 sm:pb-16 lg:px-8",
            image && "lg:grid-cols-[1.05fr_1fr] lg:gap-14"
          )}
        >
          <div className="flex flex-col gap-5">
            {where && (
              <p className="flex items-center gap-3 text-base font-medium opacity-85 sm:text-lg">
                <span
                  aria-hidden
                  className="h-1 w-10 rounded-full bg-(--brand-accent)"
                />
                {where}
              </p>
            )}
            <h1
              id="location-name"
              className={cn(
                displayFont,
                "max-w-4xl text-5xl leading-[0.95] text-balance sm:text-7xl",
                !image && "lg:text-8xl"
              )}
            >
              {location.name}
            </h1>
            {/* The intro's plain text, when there is no rich intro to render
                below (the fake adapter carries only this). */}
            {location.description && !location.intro && (
              <p className="max-w-xl text-lg text-pretty opacity-85 sm:text-xl">
                {location.description}
              </p>
            )}
            <p className="text-base opacity-75">
              {rentalCount === 0
                ? "No rentals here yet"
                : `${rentalCount} ${rentalCount === 1 ? "rental" : "rentals"}`}
            </p>
          </div>
          {image && (
            <FeedImage
              image={image}
              sizes="(min-width: 1280px) 600px, (min-width: 1024px) 48vw, 100vw"
              aspect="4/3"
              preload
              className="rounded-lg shadow-2xl ring-1 shadow-black/25 ring-white/10"
            />
          )}
        </div>
      </section>
    </>
  )
}
