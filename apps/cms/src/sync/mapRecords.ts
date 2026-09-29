import type {
  Amenity,
  Location,
  PropertyType,
  Review,
  Special,
} from "@workspace/cms-types"

import type {
  FeedAmenity,
  FeedNode,
  FeedPromo,
  FeedPropertyType,
  FeedReview,
} from "./feed"
import { toStatus, toTimestamp, type ID, type Mapped } from "./mapListing"

/**
 * Pure mappings from Feed records to the Feed-owned fields of the other
 * mirrored collections. They never produce Editorial Content, slugs,
 * Location Level/display name/visibility or Review Moderation.
 */

type Status = "active" | "withdrawn"

export type AmenityData = Pick<Amenity, "feedId" | "name"> & {
  group: string | null
  icon: string | null
  status: Status
}

export function mapAmenity(amenity: FeedAmenity): AmenityData {
  return {
    feedId: amenity.feedId,
    name: amenity.name,
    group: amenity.group,
    icon: amenity.icon,
    status: toStatus(amenity.status),
  }
}

export type PropertyTypeData = Pick<PropertyType, "feedId" | "name"> & {
  status: Status
}

export function mapPropertyType(type: FeedPropertyType): PropertyTypeData {
  return {
    feedId: type.feedId,
    name: type.name,
    status: toStatus(type.status),
  }
}

export type LocationData = Pick<Location, "feedId" | "name"> & {
  feedType: string | null
  parent: ID | null
  status: Status
}

/** `parentId`: the CMS ID of the node's parent, already mirrored (or null for a root). */
export function mapNode(node: FeedNode, parentId: ID | null): LocationData {
  return {
    feedId: node.feedId,
    name: node.name,
    feedType: node.type,
    parent: parentId,
    status: toStatus(node.status),
  }
}

export type SpecialData = Pick<Special, "feedId"> & {
  code: string | null
  status: Status
  validFrom: string | null
  validTo: string | null
  discountSummary: string | null
  properties: ID[]
  terms: string | null
}

/**
 * A promo → the Special's Feed-owned fields. `createData` is written only
 * when the Special is created: the promo's name as the initial public title
 * (Editorial Content from then on), which also gives it a slug.
 */
export function mapPromo(
  promo: FeedPromo,
  propertyId: (listingFeedId: string) => ID | undefined
): Mapped<SpecialData> & { createData: { title: string } } {
  const unresolved: string[] = []
  const properties: ID[] = []
  for (const feedId of new Set(promo.listingFeedIds)) {
    const id = propertyId(feedId)
    if (id === undefined) unresolved.push(`listing ${feedId}`)
    else properties.push(id)
  }
  return {
    unresolved,
    createData: { title: promo.name },
    data: {
      feedId: promo.feedId,
      code: promo.code,
      status: toStatus(promo.status),
      validFrom: toTimestamp(promo.validFrom),
      validTo: toTimestamp(promo.validTo),
      discountSummary: promo.discountSummary,
      properties,
      terms: promo.terms,
    },
  }
}

export type ReviewData = Pick<Review, "feedId"> & {
  property: ID
  rating: number | null
  title: string | null
  body: string | null
  guestName: string | null
  stayDate: string | null
  source: string | null
  managerResponse: string | null
  status: Status
}

/**
 * A review → the Review's Feed-owned fields. `createData` sets Moderation to
 * Pending on create only, so the Site's Moderation rule decides; the Sync
 * never writes Moderation afterwards.
 */
export function mapReview(
  review: FeedReview,
  propertyId: ID
): { data: ReviewData; createData: { moderation: "pending" } } {
  return {
    createData: { moderation: "pending" },
    data: {
      feedId: review.feedId,
      property: propertyId,
      rating: review.rating,
      title: review.title,
      body: review.body,
      guestName: review.guestName,
      stayDate: toTimestamp(review.stayDate),
      source: review.source,
      managerResponse: review.managerResponse,
      status: toStatus(review.status),
    },
  }
}
