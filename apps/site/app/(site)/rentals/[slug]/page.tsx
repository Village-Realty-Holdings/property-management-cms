import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { MapPinIcon, ViewIcon } from "lucide-react"

import {
  getLocation,
  getProperty,
  getSiteSettings,
  searchProperties,
  type LocationRef,
  type PropertyDetail,
} from "@workspace/content"
import { cn } from "@workspace/ui/lib/utils"

import { EnquireBar, EnquireCard } from "@/components/property/enquire"
import { addressLine, externalUrl, mapsUrl } from "@/components/property/format"
import { PhotoGallery } from "@/components/property/photo-gallery"
import {
  Amenities,
  hasStayPolicy,
  Highlights,
  KeyFacts,
  PropertySection,
  Reviews,
  Rooms,
  Specials,
  Stars,
  StayPolicyList,
} from "@/components/property/sections"
import { Breadcrumbs, type Crumb } from "@workspace/site-views/site/breadcrumbs"
import { displayFont } from "@workspace/site-views/site/display"
import { RichText } from "@workspace/site-views/site/rich-text"
import { resolveBrand } from "@workspace/site-views/theme/branding"
import { hasSite, readSiteEnv, requireSiteEnv } from "@/lib/site"

type Props = { params: Promise<{ slug: string }> }

const areaHref = (location: Pick<LocationRef, "path">) =>
  `/areas/${location.path.map(encodeURIComponent).join("/")}`

/**
 * Prerenders the featured Properties at build; any other slug renders on
 * its first request. Cache Components needs at least one param to validate
 * the route; without a Site (a CI build) that is a placeholder, which renders
 * the not-found page. Known params also keep `params` out of runtime data,
 * so the page renders before the response streams and notFound() sends 404.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const placeholder = [{ slug: "__placeholder__" }]
  // The fake adapter reads the clock outside 'use cache' (Specials), which
  // can't prerender; it serves every slug at request time instead.
  if (!hasSite() || readSiteEnv().contentAdapter === "fake") return placeholder
  const { docs } = await searchProperties({ sort: "featured", limit: 6 })
  return docs.length > 0
    ? docs.map((property) => ({ slug: property.slug }))
    : placeholder
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!hasSite()) return {}
  const { slug } = await params
  const property = await getProperty(slug)
  if (!property) return {}
  const title = property.seo.title ?? property.name
  const description =
    property.seo.description ??
    property.summary ??
    property.description?.slice(0, 200) ??
    undefined
  const image = property.seo.image ?? property.photos[0] ?? property.image
  return {
    title,
    description,
    alternates: { canonical: `/rentals/${property.slug}` },
    openGraph: {
      title,
      description,
      url: `/rentals/${property.slug}`,
      images: image
        ? [
            {
              url: image.url,
              alt: image.alt || property.name,
              width: image.width,
              height: image.height,
            },
          ]
        : undefined,
    },
  }
}

/** Home › Rentals › (Location's ancestors) › Location › this Property. */
async function crumbsFor(property: PropertyDetail): Promise<Crumb[]> {
  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Rentals", href: "/rentals" },
  ]
  const { location } = property
  if (location) {
    const page = await getLocation(location.path)
    for (const ancestor of page?.ancestors ?? []) {
      crumbs.push({ label: ancestor.name, href: areaHref(ancestor) })
    }
    crumbs.push({ label: location.name, href: areaHref(location) })
  }
  crumbs.push({ label: property.name })
  return crumbs
}

/** Editorial rich text, else the plain description split into paragraphs. */
function Description({ property }: { property: PropertyDetail }) {
  if (property.richDescription) {
    return <RichText data={property.richDescription} />
  }
  const paragraphs = (property.description ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (paragraphs.length === 0) return null
  return (
    <div className="flex max-w-prose flex-col gap-4 text-base leading-relaxed text-pretty">
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  )
}

const actionLinkClass =
  "inline-flex items-center gap-1.5 rounded-sm font-medium text-primary underline decoration-(--brand-accent) decoration-2 underline-offset-4 hover:decoration-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"

export default async function PropertyPage({ params }: Props) {
  await requireSiteEnv()
  const { slug } = await params
  const [property, settings] = await Promise.all([
    getProperty(slug),
    getSiteSettings(),
  ])
  // Unknown and Withdrawn Properties are invisible to readers.
  if (!property) notFound()

  const brand = resolveBrand(settings)
  const crumbs = await crumbsFor(property)
  const map = mapsUrl(property)
  const tour = externalUrl(property.virtualTourUrl)
  const address = addressLine(property.address)
  // The summary falls back to the Feed text, as does the description:
  // don't print the same words twice.
  const lead =
    property.summary && property.summary.trim() !== property.description?.trim()
      ? property.summary
      : null
  const hasDescription = !!property.richDescription || !!property.description

  return (
    <article className="mx-auto flex max-w-7xl flex-col px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <Breadcrumbs items={crumbs} className="mb-6" />

      <header className="mb-6 flex flex-col gap-3 sm:mb-8">
        <h1
          className={cn(
            displayFont,
            "max-w-4xl text-4xl leading-[1.02] text-balance sm:text-5xl lg:text-6xl"
          )}
        >
          {property.name}
        </h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-base">
          {property.location && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <MapPinIcon aria-hidden className="size-4" />
              {property.location.name}
            </p>
          )}
          {property.rating != null && (
            <a
              href="#reviews"
              className="flex items-center gap-2 rounded-sm underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Stars rating={property.rating} />
              <span className="font-medium">{property.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({property.reviewCount}
                <span className="sr-only"> reviews</span>)
              </span>
            </a>
          )}
          {tour && (
            <a
              href={tour}
              target="_blank"
              rel="noopener noreferrer"
              className={actionLinkClass}
            >
              <ViewIcon aria-hidden className="size-4" />
              Virtual tour
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      </header>

      <PhotoGallery photos={property.photos} name={property.name} />

      <div className="mt-10 grid gap-12 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <div className="flex min-w-0 flex-col gap-10">
          <div className="flex flex-col gap-6">
            <KeyFacts property={property} />
            {lead && (
              <p
                className={cn(
                  displayFont,
                  "max-w-prose text-xl leading-snug text-pretty sm:text-2xl"
                )}
              >
                {lead}
              </p>
            )}
            {hasDescription && <Description property={property} />}
          </div>

          {property.highlights.length > 0 && (
            <PropertySection id="highlights" title="Why guests love it">
              <Highlights highlights={property.highlights} />
            </PropertySection>
          )}

          {property.rooms.length > 0 && (
            <PropertySection id="rooms" title="Rooms and beds">
              <Rooms rooms={property.rooms} />
            </PropertySection>
          )}

          {property.amenities.length > 0 && (
            <PropertySection id="amenities" title="Amenities">
              <Amenities amenities={property.amenities} />
            </PropertySection>
          )}

          {property.specials.length > 0 && (
            <PropertySection
              id="specials"
              title="Specials for this home"
              description="Offers that apply to a stay here. Mention the code when you enquire."
            >
              <Specials specials={property.specials} />
            </PropertySection>
          )}

          {hasStayPolicy(property.stayPolicy) && (
            <PropertySection id="policies" title="Stay policy">
              <StayPolicyList policy={property.stayPolicy} />
            </PropertySection>
          )}

          {(property.reviews.length > 0 || property.rating != null) && (
            <PropertySection id="reviews" title="Guest reviews">
              <Reviews
                reviews={property.reviews}
                rating={property.rating}
                reviewCount={property.reviewCount}
                siteName={brand.name}
              />
            </PropertySection>
          )}

          {(map || address || property.location) && (
            <PropertySection id="location" title="Where you'll stay">
              <div className="flex flex-col gap-3">
                {(address || property.location) && (
                  <address className="leading-relaxed not-italic">
                    {address ?? property.location?.name}
                  </address>
                )}
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {map && (
                    <a
                      href={map}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={actionLinkClass}
                    >
                      <MapPinIcon aria-hidden className="size-4" />
                      Open in Google Maps
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                  {property.location && (
                    <Link
                      href={areaHref(property.location)}
                      className={actionLinkClass}
                    >
                      More about {property.location.name}
                    </Link>
                  )}
                </div>
              </div>
            </PropertySection>
          )}
        </div>

        <aside aria-label="Enquire" className="hidden lg:block">
          <div className="sticky top-6">
            <EnquireCard property={property} phone={brand.phone} />
          </div>
        </aside>
      </div>

      <div aria-hidden className="hidden h-24 lg:block" />
      <EnquireBar property={property} phone={brand.phone} />
    </article>
  )
}
