import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { MapIcon } from "lucide-react"

import { searchProperties } from "@workspace/content"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { ChildLocations } from "@/components/location/child-locations"
import {
  ComplexDetails,
  hasComplexDetails,
} from "@/components/location/complex-details"
import { LocationHero } from "@/components/location/location-hero"
import {
  loadLocation,
  locationHref,
  locationPathsInUse,
} from "@/components/location/location-links"
import { displayFont } from "@workspace/site-views/site/display"
import { PropertyGrid } from "@workspace/site-views/site/property-grid"
import { RichText } from "@workspace/site-views/site/rich-text"
import { SectionHeading } from "@workspace/site-views/site/section-heading"
import { hasSite, requireSiteEnv } from "@/lib/site"

/** Rentals shown on a Location page. */
const RENTAL_LIMIT = 48

type LocationRouteProps = { params: Promise<{ path: string[] }> }

/** Location slugs root to leaf; null when a segment can't be a slug. */
function slugPath(path: string[]): string | null {
  if (path.length === 0 || path.some((s) => !s || s.includes("/"))) return null
  return path.join("/")
}

/**
 * Locations with rentals, prerendered at build. Cache Components needs at
 * least one param; without SITE (a CI build) or Locations, a placeholder
 * 404s. Other Locations render on first request.
 */
export async function generateStaticParams(): Promise<{ path: string[] }[]> {
  const placeholder = [{ path: ["__placeholder__"] }]
  if (!hasSite()) return placeholder
  const paths = await locationPathsInUse()
  return paths.length > 0 ? paths.map((path) => ({ path })) : placeholder
}

export async function generateMetadata({
  params,
}: LocationRouteProps): Promise<Metadata> {
  await requireSiteEnv()
  const key = slugPath((await params).path)
  const location = key ? await loadLocation(key) : null
  if (!location) return {}
  const description = location.seo.description ?? location.description
  const image = location.seo.image ?? location.heroImage
  return {
    title: location.seo.title ?? location.name,
    description,
    alternates: { canonical: locationHref(location) },
    openGraph: {
      title: location.seo.title ?? location.name,
      ...(description ? { description } : {}),
      ...(image ? { images: [{ url: image.url, alt: image.alt }] } : {}),
    },
  }
}

/**
 * A Location (Destination, Area or Complex) by its slug path, e.g.
 * /areas/park-city/deer-valley. Unknown paths and broken chains are 404s.
 */
export default async function LocationRoute({ params }: LocationRouteProps) {
  await requireSiteEnv()
  const key = slugPath((await params).path)
  const location = key ? await loadLocation(key) : null
  if (!location) notFound()

  // Properties in the Location or any Location inside it.
  const rentals = await searchProperties({
    locationId: location.id,
    limit: RENTAL_LIMIT,
  })
  const parent = location.ancestors.at(-1)
  const showComplex = hasComplexDetails(location.complex)
  const hasMain = !!location.intro?.root?.children?.length || showComplex
  const children = location.children

  return (
    <>
      <LocationHero location={location} rentalCount={rentals.totalDocs} />

      {(hasMain || children.length > 0) && (
        <div
          className={cn(
            "mx-auto grid max-w-7xl gap-14 px-4 pt-14 sm:px-6 sm:pt-20 lg:px-8",
            hasMain &&
              children.length > 0 &&
              "lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16"
          )}
        >
          {hasMain && (
            <div className="flex flex-col gap-12">
              <RichText
                data={location.intro}
                className="text-lg sm:text-xl sm:leading-relaxed"
              />
              {location.complex && showComplex && (
                <ComplexDetails
                  details={location.complex}
                  name={location.name}
                />
              )}
            </div>
          )}
          {children.length > 0 && (
            <nav
              aria-labelledby="inside-heading"
              className="flex flex-col gap-5"
            >
              <h2
                id="inside-heading"
                className={cn(displayFont, "text-3xl leading-tight")}
              >
                Places in {location.name}
              </h2>
              <ChildLocations
                locations={children}
                className={cn(
                  !hasMain &&
                    "sm:grid sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3"
                )}
              />
            </nav>
          )}
        </div>
      )}

      <section
        aria-labelledby="rentals-heading"
        className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <SectionHeading
          id="rentals-heading"
          title={`Places to stay in ${location.name}`}
          description={
            rentals.totalDocs > rentals.docs.length
              ? `The first ${rentals.docs.length} of ${rentals.totalDocs} rentals, featured homes first.`
              : children.length > 0 && rentals.totalDocs > 0
                ? `Every rental in ${location.name} and the places inside it.`
                : undefined
          }
        />
        <PropertyGrid
          properties={rentals.docs}
          preloadCount={location.heroImage ? 0 : 3}
          empty={{
            title: `No rentals in ${location.name} yet`,
            description: "New homes are added often. Look around nearby.",
            action: (
              <Link
                href={parent ? locationHref(parent) : "/areas"}
                className={buttonVariants({ size: "lg" })}
              >
                <MapIcon data-icon="inline-start" aria-hidden />
                {parent ? `See ${parent.name}` : "See all areas"}
              </Link>
            ),
          }}
        />
      </section>
    </>
  )
}
