/**
 * The `PropertyFeed` seam: only what the Sync needs from the Property Feed
 * (docs/module-layout.md, "sync/"). The Property Feed is Awayday's API in
 * front of each Site's PMS accounts (ADR-0001); its contract is still to be
 * agreed, so these types are the Sync's side of that future contract.
 *
 * Everything here is in Awayday-normalised form: PMS-agnostic, with
 * Amenities and Property Types already mapped onto the Awayday-wide
 * vocabulary (ADR-0013). No Track or Streamline concepts leak through.
 *
 * Adapters: ./fakeFeed.ts (in-memory, for tests and demos) and ./httpFeed.ts
 * (the real Feed, pending its contract).
 */

/** A Site's account in the Property Feed (`site.feedAccountRef`). */
export type FeedAccountRef = string

/**
 * Lifecycle of a Feed record. `inactive` records are still listed so the
 * Sync can withdraw them; a record missing from a listing is withdrawn too.
 */
export type FeedStatus = "active" | "inactive"

/** An Amenity in the Awayday-wide vocabulary. */
export interface FeedAmenity {
  /** Stable key, e.g. "hot-tub". */
  feedId: string
  name: string
  /** Grouping for filters, e.g. "Outdoor", "Views". */
  group: string | null
  /** Icon key, e.g. "hot-tub". Sites may override it. */
  icon: string | null
  status: FeedStatus
}

/** A Property Type in the Awayday-wide vocabulary. */
export interface FeedPropertyType {
  /** Stable key, e.g. "cabin". */
  feedId: string
  name: string
  status: FeedStatus
}

export interface FeedVocabularies {
  amenities: FeedAmenity[]
  propertyTypes: FeedPropertyType[]
}

/**
 * A node in the account's location tree (Track node, Streamline resort
 * area…). Mirrored as a Location (ADR-0012).
 */
export interface FeedNode {
  feedId: string
  name: string
  /** The PMS's own label for the node ("region", "city", "resort"…). Reference only. */
  type: string | null
  /** The parent node's Feed ID, or null for a root. */
  parentFeedId: string | null
  status: FeedStatus
}

export interface FeedPhoto {
  /** Absolute URL on the Feed's photo host. Never re-uploaded (ADR-0008). */
  url: string
  caption: string | null
  /** Pixel size, when the Feed knows it. */
  width: number | null
  height: number | null
}

export interface FeedAddress {
  line1: string | null
  city: string | null
  /** State, province or county, e.g. "TN". */
  region: string | null
  postalCode: string | null
  /** ISO 3166-1 alpha-2, e.g. "US". */
  country: string | null
}

export interface FeedGeo {
  lat: number
  lng: number
}

export interface FeedBed {
  /** Lower-case bed kind: "king", "queen", "full", "twin", "bunk", "sofa-sleeper"… */
  type: string
  count: number
}

/** A bedroom or other sleeping space. */
export interface FeedRoom {
  name: string
  sleeps: number | null
  beds: FeedBed[]
}

/** Null values fall back to the Site's default Stay Policy. */
export interface FeedStayPolicy {
  /** Local time "HH:mm". */
  checkIn: string | null
  /** Local time "HH:mm". */
  checkOut: string | null
  houseRules: string | null
  /** Cancellation and deposit terms. */
  cancellationPolicy: string | null
  /** Minimum age of the lead guest. */
  minimumAge: number | null
}

/** The Feed's record of one bookable vacation rental (a Property in the CMS). */
export interface FeedListing {
  feedId: string
  name: string
  /** Plain text; paragraphs separated by blank lines. */
  description: string | null
  status: FeedStatus
  /** The node the listing belongs to. */
  nodeFeedId: string | null
  propertyTypeFeedId: string | null
  amenityFeedIds: string[]
  bedrooms: number | null
  /** Whole or half numbers (2.5 = two full baths and a half bath). */
  bathrooms: number | null
  sleeps: number | null
  petsAllowed: boolean
  /** False when the listing can only be booked by phone or enquiry. */
  onlineBookable: boolean
  virtualTourUrl: string | null
  /** In display order. */
  photos: FeedPhoto[]
  address: FeedAddress
  geo: FeedGeo | null
  rooms: FeedRoom[]
  stayPolicy: FeedStayPolicy
  /** ISO 8601 timestamp of the listing's last change in the Feed. */
  updatedAt: string
}

/** A promotion (a Special in the CMS). Quotes apply it; the CMS only shows it. */
export interface FeedPromo {
  feedId: string
  /** Internal name; the CMS uses it only as the initial public title. */
  name: string
  code: string | null
  status: FeedStatus
  /** ISO 8601 date or timestamp; null for open-ended. */
  validFrom: string | null
  validTo: string | null
  /** Human-readable discount, e.g. "20% off rent". */
  discountSummary: string | null
  terms: string | null
  /** The listings the promo applies to. */
  listingFeedIds: string[]
}

/** A guest review of a stay, aggregated by the Feed from its sources. */
export interface FeedReview {
  feedId: string
  listingFeedId: string
  /** 0–5. */
  rating: number | null
  title: string | null
  body: string | null
  /** Display name only, e.g. "Sarah M." */
  guestName: string | null
  /** ISO 8601 date of the stay. */
  stayDate: string | null
  /** Where the review came from, e.g. "Airbnb", "Direct". */
  source: string | null
  managerResponse: string | null
  status: FeedStatus
}

/**
 * What the Sync reads from the Property Feed. Listing calls return the
 * account's full set (adapters page internally), including inactive records,
 * so the Sync can withdraw what is missing or inactive.
 */
export interface PropertyFeed {
  /** The Awayday-wide Amenity and Property Type vocabularies. */
  listVocabularies(): Promise<FeedVocabularies>
  /** The account's location tree, in any order. */
  listNodes(account: FeedAccountRef): Promise<FeedNode[]>
  listListings(account: FeedAccountRef): Promise<FeedListing[]>
  /** One listing, or null when the account has no such listing. */
  getListing(
    account: FeedAccountRef,
    feedId: string
  ): Promise<FeedListing | null>
  listPromos(account: FeedAccountRef): Promise<FeedPromo[]>
  listReviews(account: FeedAccountRef): Promise<FeedReview[]>
}

/** The Feed doesn't know the account. */
export class UnknownFeedAccountError extends Error {
  constructor(account: FeedAccountRef) {
    super(`Unknown Property Feed account "${account}"`)
    this.name = "UnknownFeedAccountError"
  }
}

/** The Property Feed can't be reached from here yet (no contract, no adapter). */
export class PropertyFeedUnavailableError extends Error {
  constructor(message = "Property Feed contract pending") {
    super(message)
    this.name = "PropertyFeedUnavailableError"
  }
}
