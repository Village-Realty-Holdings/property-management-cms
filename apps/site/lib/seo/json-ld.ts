import type { PropertyDetail } from "@workspace/content"

/**
 * schema.org JSON-LD builders. Render the result with `<JsonLd data={…} />`
 * (./json-ld-script.tsx). URLs are made absolute with `origin` (see
 * `siteOrigin`), since JSON-LD has no base URL.
 */

export type JsonLdObject = { "@context"?: string; "@type": string } & Record<
  string,
  unknown
>

const context = "https://schema.org"

const absolute = (url: string, origin?: string) =>
  origin ? new URL(url, `${origin}/`).toString() : url

/** Drops null/undefined/empty-array values so the output stays tidy. */
function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, v]) =>
        v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)
    )
  ) as T
}

/**
 * A Property as a schema.org VacationRental, in the shape Google's vacation
 * rental structured data expects: the unit's facts (bedrooms, occupancy,
 * amenities) sit on `containsPlace`, an Accommodation.
 */
export function vacationRentalJsonLd(
  property: PropertyDetail,
  { origin, path }: { origin?: string; path?: string } = {}
): JsonLdObject {
  const photos = property.photos.length
    ? property.photos
    : property.image
      ? [property.image]
      : []
  const address = property.address
  return compact({
    "@context": context,
    "@type": "VacationRental",
    identifier: property.feedId,
    name: property.name,
    description: property.summary ?? property.description ?? null,
    url: path ? absolute(path, origin) : null,
    image: photos.map((photo) => absolute(photo.url, origin)),
    address: address
      ? compact({
          "@type": "PostalAddress",
          streetAddress: address.line1,
          addressLocality: address.city,
          addressRegion: address.region,
          postalCode: address.postalCode,
          addressCountry: address.country,
        })
      : null,
    geo: property.geo
      ? {
          "@type": "GeoCoordinates",
          latitude: property.geo.lat,
          longitude: property.geo.lng,
        }
      : null,
    containsPlace: compact({
      "@type": "Accommodation",
      additionalType: property.propertyType?.name ?? null,
      numberOfBedrooms: property.bedrooms,
      numberOfBathroomsTotal: property.bathrooms,
      occupancy:
        property.sleeps != null
          ? { "@type": "QuantitativeValue", value: property.sleeps }
          : null,
      amenityFeature: property.amenities.map((amenity) => ({
        "@type": "LocationFeatureSpecification",
        name: amenity.name,
        value: true,
      })),
      petsAllowed: property.petsAllowed,
    }),
    aggregateRating:
      property.rating != null && property.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: property.rating,
            reviewCount: property.reviewCount,
            bestRating: 5,
          }
        : null,
  })
}

export type BreadcrumbItem = {
  name: string
  /** Site-relative path; the last item (the current page) may omit it. */
  path?: string
}

/** A schema.org BreadcrumbList, root first. */
export function breadcrumbJsonLd(
  items: readonly BreadcrumbItem[],
  { origin }: { origin?: string } = {}
): JsonLdObject {
  return {
    "@context": context,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) =>
      compact({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.path ? absolute(item.path, origin) : null,
      })
    ),
  }
}

/**
 * JSON for a `<script type="application/ld+json">`: `<` is escaped so a
 * value can't close the script element.
 */
export function serializeJsonLd(data: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
