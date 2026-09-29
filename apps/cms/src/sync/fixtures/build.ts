import type {
  FeedListing,
  FeedNode,
  FeedPhoto,
  FeedPromo,
  FeedReview,
  FeedRoom,
  FeedStayPolicy,
} from "../feed"
import type { FakeFeedAccount } from "../fakeFeed"

/**
 * Builds a realistic, deterministic demo Feed account from compact tables
 * (./demoMountain.ts, ./demoBeach.ts). No randomness and no clock: the same
 * input always gives the same records, so a second Sync is "unchanged".
 */

/** A node plus what its listings share: position, and an address for Complexes. */
export type NodeSpec = FeedNode & {
  city: string
  postalCode: string
  center: { lat: number; lng: number }
  /** Complexes: the shared street address; listings add their unit. */
  street?: string
}

export type ListingRow = {
  feedId: string
  name: string
  node: string
  type: "cabin" | "condo" | "house" | "townhouse" | "chalet" | "studio"
  bedrooms: number
  bathrooms: number
  sleeps: number
  amenities: string[]
  /** Street address for listings outside a Complex; the unit inside one. */
  street: string
  inactive?: boolean
  offline?: boolean
  /** Only check-in/out missing: falls back to the Site's default. */
  noTimes?: boolean
}

export type AccountSpec = {
  region: string
  nodes: NodeSpec[]
  listings: ListingRow[]
  stayPolicy: FeedStayPolicy
  /** One sentence about the area, used in descriptions. */
  areaBlurb: string
  promos: FeedPromo[]
  reviewPool: ReviewPool
}

export type ReviewPool = {
  great: { title: string; body: string }[]
  good: { title: string; body: string }[]
  mixed: { title: string; body: string; response: string }[]
}

const PHOTO_CAPTIONS = [
  "Exterior",
  "Living room",
  "Kitchen",
  "Primary bedroom",
  "Bathroom",
  "View",
  "Outdoor space",
  "Dining area",
  "Second bedroom",
]

const TYPE_LABEL: Record<ListingRow["type"], string> = {
  cabin: "cabin",
  condo: "condo",
  house: "vacation home",
  townhouse: "townhome",
  chalet: "chalet",
  studio: "studio",
}

const AMENITY_COPY: Record<string, string> = {
  "hot-tub": "Soak in the private hot tub after a day out.",
  pool: "The private pool is heated from spring to fall.",
  "community-pool": "Guests share the community pool.",
  "game-room": "The game room keeps everyone busy on rainy days.",
  "pool-table": "There is a pool table downstairs.",
  "home-theater": "Movie nights happen in the home theater.",
  fireplace: "Curl up by the fireplace on cool evenings.",
  "mountain-view": "Wake up to long mountain views.",
  "ocean-view": "Watch the sunset over the Gulf from the balcony.",
  beachfront: "Step straight from the property onto the sand.",
  "beach-access": "A private boardwalk leads to the beach.",
  "walk-to-town": "Shops and restaurants are an easy walk away.",
  "pet-friendly": "Well-behaved dogs are welcome (fee applies).",
  "ski-in-ski-out": "Ski straight to the lift in winter.",
}

const GUESTS = [
  "Sarah M.",
  "James T.",
  "The Patel family",
  "Megan R.",
  "Chris & Dana",
  "Luis G.",
  "Karen W.",
  "Tom B.",
  "Aisha K.",
  "Robert L.",
  "Jenny H.",
  "Mike & Laura",
]

const SOURCES = ["Direct", "Airbnb", "Vrbo", "Google"]
const RATINGS = [5, 4, 5, 5, 3, 4, 5, 4, 5, 3, 5, 4]

export function buildAccount(spec: AccountSpec): FakeFeedAccount {
  const nodes = new Map(spec.nodes.map((node) => [node.feedId, node]))
  const listings = spec.listings.map((row, index) =>
    buildListing(spec, row, index, nodes)
  )
  return {
    nodes: spec.nodes.map(
      ({ feedId, name, type, parentFeedId, status }): FeedNode => ({
        feedId,
        name,
        type,
        parentFeedId,
        status,
      })
    ),
    listings,
    promos: structuredClone(spec.promos),
    reviews: listings.flatMap((listing, index) =>
      buildReviews(spec.reviewPool, listing, index)
    ),
  }
}

function buildListing(
  spec: AccountSpec,
  row: ListingRow,
  index: number,
  nodes: Map<string, NodeSpec>
): FeedListing {
  const node = nodes.get(row.node)
  if (!node)
    throw new Error(`Fixture listing ${row.feedId}: no node ${row.node}`)
  const inComplex = Boolean(node.street)
  const { lat, lng } = node.center
  // Complex units share (nearly) one point; standalone homes spread out.
  const spread = inComplex ? 0.0004 : 0.012
  const offset = (n: number) => (((index * n) % 17) - 8) / 8

  return {
    feedId: row.feedId,
    name: row.name,
    description: describeListing(spec, row, node.name),
    status: row.inactive ? "inactive" : "active",
    nodeFeedId: row.node,
    propertyTypeFeedId: row.type,
    amenityFeedIds: row.amenities,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    sleeps: row.sleeps,
    petsAllowed: row.amenities.includes("pet-friendly"),
    onlineBookable: !row.offline,
    virtualTourUrl:
      index % 4 === 1
        ? `https://my.matterport.com/show/?m=demo${row.feedId}`
        : null,
    photos: photos(row.feedId, 5 + (index % 4)),
    address: {
      line1: inComplex ? `${node.street}, Unit ${row.street}` : row.street,
      city: node.city,
      region: spec.region,
      postalCode: node.postalCode,
      country: "US",
    },
    geo: {
      lat: round(lat + offset(5) * spread, 5),
      lng: round(lng + offset(7) * spread, 5),
    },
    rooms: rooms(row),
    stayPolicy: row.noTimes
      ? { ...spec.stayPolicy, checkIn: null, checkOut: null }
      : { ...spec.stayPolicy },
    updatedAt: new Date(
      Date.UTC(2026, 8, 1 + (index % 20), 12, (index * 7) % 60)
    ).toISOString(),
  }
}

function describeListing(
  spec: AccountSpec,
  row: ListingRow,
  area: string
): string {
  const size = row.bedrooms === 0 ? "A cozy" : `A ${row.bedrooms}-bedroom`
  const intro = `${size} ${TYPE_LABEL[row.type]} in ${area} that sleeps ${row.sleeps}, with ${row.bathrooms} bathrooms.`
  const features = row.amenities
    .map((feedId) => AMENITY_COPY[feedId])
    .filter(Boolean)
    .slice(0, 3)
    .join(" ")
  return [`${row.name}: ${intro} ${features}`.trim(), spec.areaBlurb].join(
    "\n\n"
  )
}

function photos(feedId: string, count: number): FeedPhoto[] {
  return Array.from({ length: count }, (_, i) => ({
    url: `https://picsum.photos/seed/${feedId}-${i + 1}/1600/1067`,
    caption: PHOTO_CAPTIONS[i % PHOTO_CAPTIONS.length] ?? null,
    width: 1600,
    height: 1067,
  }))
}

/** Rooms that add up to the listing's capacity. */
function rooms(row: ListingRow): FeedRoom[] {
  if (row.bedrooms === 0) {
    return [
      {
        name: "Studio",
        sleeps: row.sleeps,
        beds: [
          { type: "queen", count: 1 },
          ...(row.sleeps > 2 ? [{ type: "sofa-sleeper", count: 1 }] : []),
        ],
      },
    ]
  }
  const result: FeedRoom[] = []
  let remaining = row.sleeps
  for (let n = 1; n <= row.bedrooms; n++) {
    const isBunkRoom = n === row.bedrooms && row.bedrooms >= 3 && remaining >= 6
    if (n === 1) {
      result.push({
        name: "Primary bedroom",
        sleeps: 2,
        beds: [{ type: "king", count: 1 }],
      })
      remaining -= 2
    } else if (isBunkRoom) {
      result.push({
        name: "Bunk room",
        sleeps: 4,
        beds: [{ type: "bunk", count: 2 }],
      })
      remaining -= 4
    } else {
      result.push({
        name: `Bedroom ${n}`,
        sleeps: 2,
        beds: [
          { type: n % 2 === 0 ? "queen" : "twin", count: n % 2 === 0 ? 1 : 2 },
        ],
      })
      remaining -= 2
    }
  }
  if (remaining > 0) {
    result.push({
      name: "Living room",
      sleeps: remaining,
      beds: [{ type: "sofa-sleeper", count: Math.ceil(remaining / 2) }],
    })
  }
  return result
}

/** 3–6 reviews for two in three listings; none for the rest. */
function buildReviews(
  pool: ReviewPool,
  listing: FeedListing,
  index: number
): FeedReview[] {
  if (index % 3 === 2) return []
  const count = 3 + (index % 4)
  return Array.from({ length: count }, (_, n) => {
    const rating = RATINGS[(index + n * 5) % RATINGS.length] ?? 5
    const k = index + n
    const pick = <T>(list: T[]): T => list[k % list.length] as T
    const text =
      rating === 5 ? pick(pool.great) : rating === 4 ? pick(pool.good) : null
    const mixed = text ? null : pick(pool.mixed)
    const month = 1 + ((index * 3 + n * 2) % 8)
    const day = 1 + ((index + n * 11) % 27)
    return {
      feedId: `${listing.feedId}-R${n + 1}`,
      listingFeedId: listing.feedId,
      rating,
      title: (text ?? mixed)?.title ?? null,
      body: (text ?? mixed)?.body ?? null,
      guestName: pick(GUESTS),
      stayDate: `2026-${pad(month)}-${pad(day)}`,
      source: SOURCES[(index + n) % SOURCES.length] ?? null,
      managerResponse: mixed
        ? mixed.response
        : n === 0 && index % 2 === 0
          ? `Thank you for staying at ${listing.name}! We hope to welcome you back soon.`
          : null,
      status: "active",
    }
  })
}

const pad = (n: number) => String(n).padStart(2, "0")
const round = (value: number, digits: number) =>
  Math.round(value * 10 ** digits) / 10 ** digits
