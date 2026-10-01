import type { Property } from "@workspace/cms-types"

import type { FeedListing, FeedStatus } from "./feed"

/** A CMS document ID. */
export type ID = number

/** The Feed-owned fields of a Property: all the Sync ever writes (ADR-0001). */
export const PROPERTY_FACT_KEYS = [
  "feedId",
  "feedName",
  "status",
  "location",
  "propertyType",
  "amenities",
  "bedrooms",
  "bathrooms",
  "sleeps",
  "petsAllowed",
  "feedDescription",
  "onlineBookable",
  "feedUpdatedAt",
  "virtualTourUrl",
  "photos",
  "address",
  "geo",
  "rooms",
  "stayPolicy",
] as const satisfies readonly (keyof Property)[]

type FactKey = (typeof PROPERTY_FACT_KEYS)[number]

/**
 * Property Facts as the Sync writes them. Never Editorial Content, the slug,
 * or `rating`/`reviewCount` (computed from Reviews).
 */
export type PropertyFacts = {
  [K in FactKey]-?: Exclude<Property[K], undefined>
} & {
  location: ID | null
  propertyType: ID | null
  amenities: ID[]
  photos: NonNullable<Property["photos"]>
  rooms: NonNullable<Property["rooms"]>
}

/** Feed IDs → CMS IDs of the documents a listing refers to. */
export type ListingRefs = {
  location(feedId: string): ID | undefined
  propertyType(feedId: string): ID | undefined
  amenity(feedId: string): ID | undefined
}

export type Mapped<T> = {
  data: T
  /** References that didn't resolve (left empty or dropped), e.g. "amenity sauna". */
  unresolved: string[]
}

/** Feed `active`/`inactive` → CMS Active/Withdrawn (ADR-0002). */
export function toStatus(status: FeedStatus): "active" | "withdrawn" {
  return status === "active" ? "active" : "withdrawn"
}

/**
 * An ISO timestamp as Payload stores dates, so re-syncing compares equal.
 * Null for missing or unparseable values.
 */
export function toTimestamp(value: string | null | undefined): string | null {
  if (!value) return null
  const time = new Date(value)
  return Number.isNaN(time.getTime()) ? null : time.toISOString()
}

/** A Feed Listing → Property Facts. Pure. */
export function mapListing(
  listing: FeedListing,
  refs: ListingRefs
): Mapped<PropertyFacts> {
  const unresolved: string[] = []
  const resolve = (
    kind: string,
    feedId: string | null,
    lookup: (feedId: string) => ID | undefined
  ): ID | null => {
    if (!feedId) return null
    const id = lookup(feedId)
    if (id === undefined) unresolved.push(`${kind} ${feedId}`)
    return id ?? null
  }

  const amenities = [...new Set(listing.amenityFeedIds)]
    .map((feedId) => resolve("amenity", feedId, refs.amenity))
    .filter((id): id is ID => id !== null)

  return {
    unresolved,
    data: {
      feedId: listing.feedId,
      feedName: listing.name,
      status: toStatus(listing.status),
      location: resolve("location", listing.nodeFeedId, refs.location),
      propertyType: resolve(
        "property type",
        listing.propertyTypeFeedId,
        refs.propertyType
      ),
      amenities,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      sleeps: listing.sleeps,
      petsAllowed: listing.petsAllowed,
      feedDescription: listing.description,
      onlineBookable: listing.onlineBookable,
      feedUpdatedAt: toTimestamp(listing.updatedAt),
      virtualTourUrl: listing.virtualTourUrl,
      photos: listing.photos.map(({ url, caption, width, height }) => ({
        url,
        caption,
        width,
        height,
      })),
      address: {
        line1: listing.address.line1,
        city: listing.address.city,
        region: listing.address.region,
        postalCode: listing.address.postalCode,
        country: listing.address.country,
      },
      geo: { lat: listing.geo?.lat ?? null, lng: listing.geo?.lng ?? null },
      rooms: listing.rooms.map((room) => ({
        name: room.name,
        sleeps: room.sleeps,
        beds: room.beds.map(({ type, count }) => ({ type, count })),
      })),
      stayPolicy: {
        checkIn: listing.stayPolicy.checkIn,
        checkOut: listing.stayPolicy.checkOut,
        houseRules: listing.stayPolicy.houseRules,
        cancellationPolicy: listing.stayPolicy.cancellationPolicy,
        minimumAge: listing.stayPolicy.minimumAge,
      },
    },
  }
}
