import type {
  AmenityInput,
  CuratedListRule,
  LegacyUrlSettings,
  PartialStayPolicy,
  SitePresentation,
  SitePropertyTypeLabels,
} from "../shared"
import type {
  Block,
  Branding,
  CuratedListSort,
  LocationLevel,
  PropertyType,
} from "../types"

/**
 * In-memory demo content for two Sites, keyed by SITE: demo-mountain and
 * demo-beach. Shapes mirror the CMS collections, not the site-facing types;
 * ../fake/index.ts maps them the way the REST adapter does.
 */

type Status = "active" | "withdrawn"
type Draft = "draft" | "published"

export type FakeLocation = {
  id: string
  /** The Feed name. */
  name: string
  displayName?: string
  slug: string
  level: LocationLevel | null
  parentId: string | null
  visible: boolean
  status: Status
  description: string | null
  /** Complex Locations only. */
  complex?: { address: string; sharedAmenityIds: string[] }
}

export type FakeProperty = {
  id: string
  feedId: string
  slug: string
  /** The Feed name. */
  name: string
  /** Editorial headline; the name when null. */
  headline: string | null
  featured: boolean
  status: Status
  locationId: string
  propertyTypeId: string
  amenityIds: string[]
  bedrooms: number
  bathrooms: number
  sleeps: number
  petsAllowed: boolean
  rating: number | null
  reviewCount: number
  /** Editorial description; the Feed description when null. */
  description: string | null
  feedDescription: string
  stayPolicy: PartialStayPolicy
  reviews: { id: string; rating: number; body: string; moderation: string }[]
}

/** The Site document: identity, branding and presentation. */
export type FakeSettings = SitePresentation &
  SitePropertyTypeLabels & {
    slug: string
    name: string
    domain: string | null
    branding: Branding
    stayPolicyDefaults: PartialStayPolicy
    /** The Legacy URLs tab; none when unset. */
    legacyUrls?: LegacyUrlSettings
    client?: { name?: string | null; website?: string | null }
    customVariables?: { key: string; value: string }[]
  }

export type FakeSite = {
  settings: FakeSettings
  locations: FakeLocation[]
  properties: FakeProperty[]
  curatedLists: {
    id: string
    slug: string
    title: string
    description: string | null
    rule: CuratedListRule
    sort?: CuratedListSort
    status: Draft
  }[]
  pages: {
    id: string
    title: string
    path: string
    template?: "blank" | "tuckIn"
    blocks: Block[]
    showInNav?: boolean
    navOrder?: number
    status: Draft
  }[]
  guides: {
    id: string
    slug: string
    title: string
    excerpt: string | null
    publishedAt: string
    locationIds: string[]
    propertyIds?: string[]
    status: Draft
  }[]
  specials: {
    id: string
    slug: string
    code: string
    title: string
    description: string | null
    validFrom: string | null
    validTo: string | null
    showOnSite: boolean
    propertyIds: string[]
  }[]
}

/** Shared vocabularies (ADR-0013): the same across Sites. */
export const amenities: (AmenityInput & { id: string })[] = [
  {
    id: "a1",
    feedId: "hot-tub",
    name: "Hot tub",
    group: "Outdoor",
    icon: "hot-tub",
  },
  {
    id: "a2",
    feedId: "ski-in-out",
    name: "Ski-in/ski-out",
    group: "Location",
    icon: "ski",
  },
  { id: "a3", feedId: "pool", name: "Pool", group: "Outdoor", icon: "pool" },
  { id: "a4", feedId: "wifi", name: "Wi-Fi", group: "Indoor", icon: "wifi" },
  {
    id: "a5",
    feedId: "ocean-view",
    name: "Ocean view",
    group: "Location",
    icon: "waves",
  },
  {
    id: "a6",
    feedId: "fireplace",
    name: "Fireplace",
    group: "Indoor",
    icon: "flame",
  },
  {
    id: "a7",
    feedId: "sauna",
    name: "Sauna",
    group: "Indoor",
    icon: "sauna",
    status: "withdrawn",
  },
]

export const propertyTypes: PropertyType[] = [
  { id: "t1", feedId: "cabin", name: "Cabin" },
  { id: "t2", feedId: "condo", name: "Condo" },
  { id: "t3", feedId: "house", name: "House" },
  { id: "t4", feedId: "townhouse", name: "Townhouse" },
]

type PropertySeed = [
  name: string,
  locationId: string,
  propertyTypeId: string,
  amenityIds: string[],
  bedrooms: number,
  bathrooms: number,
  sleeps: number,
  petsAllowed: boolean,
  status?: Status,
]

function properties(prefix: string, seeds: PropertySeed[]): FakeProperty[] {
  return seeds.map(
    (
      [
        name,
        locationId,
        propertyTypeId,
        amenityIds,
        bedrooms,
        bathrooms,
        sleeps,
        petsAllowed,
        status = "active",
      ],
      i
    ) => ({
      id: `${prefix}-p${i + 1}`,
      feedId: `${prefix.toUpperCase()}-${1000 + i}`,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      headline: i === 0 ? `${name}: our favourite` : null,
      featured: i < 2,
      status,
      locationId,
      propertyTypeId,
      amenityIds,
      bedrooms,
      bathrooms,
      sleeps,
      petsAllowed,
      rating: i % 3 === 0 ? null : 4 + (i % 10) / 10,
      reviewCount: i % 3 === 0 ? 0 : 3 + i,
      description: i % 2 === 0 ? `${name}: a demo Property.` : null,
      feedDescription: `${name}, as the Property Feed describes it.`,
      stayPolicy: i % 2 === 0 ? { checkIn: "15:00" } : {},
      reviews:
        i % 3 === 0
          ? []
          : [
              {
                id: `${prefix}-r${i}a`,
                rating: 5,
                body: "Wonderful stay.",
                moderation: "shown",
              },
              {
                id: `${prefix}-r${i}b`,
                rating: 1,
                body: "Hidden review.",
                moderation: "hidden",
              },
            ],
    })
  )
}

const mountain: FakeSite = {
  settings: {
    slug: "demo-mountain",
    name: "Demo Mountain Rentals",
    domain: "mountain.example.com",
    branding: {
      logo: null,
      primaryColor: "#1f4d3a",
      accentColor: "#d98e04",
      fontPairing: "rustic",
      tagline: "Cabins and condos at the foot of the Wasatch",
      phone: "+1 435 555 0100",
      email: "stay@mountain.example.com",
      address: "123 Main Street, Park City, UT 84060",
      social: [
        { platform: "instagram", url: "https://instagram.com/demo-mountain" },
        { platform: "facebook", url: "https://facebook.com/demo-mountain" },
      ],
    },
    amenityPresentation: {
      filters: [
        { amenity: "a2", label: "Ski-in / ski-out" },
        { amenity: "a1" },
        { amenity: "a6", icon: "fireplace" },
      ],
      hidden: ["a5"],
    },
    propertyTypeLabels: {
      labels: [{ propertyType: "t1", label: "Log cabin" }],
    },
    stayPolicyDefaults: {
      checkIn: "16:00",
      checkOut: "10:00",
      houseRules: "No parties. Quiet hours 10pm–8am.",
      cancellationPolicy: "Full refund up to 30 days before arrival.",
      minimumAge: 25,
    },
    legacyUrls: {
      propertyPattern: "cabin-rentals",
      redirects: [{ from: "/about-us.html", to: "/about" }],
    },
  },
  locations: [
    {
      id: "m-l1",
      name: "Park City",
      slug: "park-city",
      level: "destination",
      parentId: null,
      visible: true,
      status: "active",
      description: "Ski town in the Wasatch.",
    },
    {
      id: "m-l2",
      name: "Deer Valley",
      slug: "deer-valley",
      level: "area",
      parentId: "m-l1",
      visible: true,
      status: "active",
      description: null,
    },
    {
      id: "m-l3",
      name: "Silver Lake Lodge",
      slug: "silver-lake-lodge",
      level: "complex",
      parentId: "m-l2",
      visible: true,
      status: "active",
      description: "Ski-in/ski-out Complex at mid-mountain.",
      complex: {
        address: "7520 Royal Street, Park City, UT",
        sharedAmenityIds: ["a2", "a1"],
      },
    },
    {
      id: "m-l4",
      name: "Canyons Village",
      displayName: "Canyons Village at Park City",
      slug: "canyons-village",
      level: "area",
      parentId: "m-l1",
      visible: true,
      status: "active",
      description: null,
    },
    {
      id: "m-l5",
      name: "Old Node",
      slug: "old-node",
      level: null,
      parentId: "m-l1",
      visible: false,
      status: "active",
      description: null,
    },
  ],
  properties: properties("m", [
    ["Aspen Hideaway", "m-l2", "t1", ["a1", "a6", "a4"], 3, 2, 8, true],
    ["Silver Lake 201", "m-l3", "t2", ["a2", "a4"], 2, 2, 6, false],
    ["Silver Lake 305", "m-l3", "t2", ["a2", "a1", "a4"], 3, 3, 8, false],
    ["Canyons Chalet", "m-l4", "t3", ["a1", "a6", "a4"], 5, 4.5, 14, true],
    ["Bear Den Cabin", "m-l2", "t1", ["a6"], 2, 1, 4, true],
    ["Main Street Loft", "m-l1", "t2", ["a4"], 1, 1, 2, false],
    ["Powder Townhome", "m-l4", "t4", ["a1", "a4"], 4, 3.5, 10, false],
    ["Retired Retreat", "m-l2", "t1", ["a1"], 3, 2, 6, true, "withdrawn"],
  ]),
  curatedLists: [
    {
      id: "m-c1",
      slug: "pet-friendly-park-city",
      title: "Pet-friendly Park City rentals",
      description: "Bring the dog.",
      rule: { locationId: "m-l1", petsAllowed: true },
      status: "published",
    },
    {
      id: "m-c3",
      slug: "hot-tub-and-fireplace",
      title: "Hot tub and fireplace",
      description: "Warm up après-ski.",
      rule: { amenityIds: ["a1", "a6"] },
      sort: "sleeps",
      status: "published",
    },
    {
      id: "m-c2",
      slug: "draft-list",
      title: "Draft list",
      description: null,
      rule: {},
      status: "draft",
    },
  ],
  pages: [
    {
      id: "m-pg1",
      title: "Home",
      path: "/",
      blocks: [{ blockType: "hero", heading: "Ski-in, ski-out" }],
      status: "published",
    },
    {
      id: "m-pg2",
      title: "About",
      path: "/about",
      blocks: [{ blockType: "richText", text: "Family-run since 1998." }],
      showInNav: true,
      navOrder: 2,
      status: "published",
    },
    {
      id: "m-pg4",
      title: "Owners",
      path: "/owners",
      blocks: [{ blockType: "hero", heading: "List your home with us" }],
      showInNav: true,
      navOrder: 1,
      status: "published",
    },
    {
      id: "m-pg3",
      title: "Unpublished",
      path: "/secret",
      blocks: [],
      showInNav: true,
      status: "draft",
    },
  ],
  guides: [
    {
      id: "m-g1",
      slug: "best-walks-near-park-city",
      title: "Best walks near Park City",
      excerpt: "Summer trails for every level.",
      publishedAt: "2026-06-01T00:00:00.000Z",
      locationIds: ["m-l1"],
      status: "published",
    },
  ],
  specials: [
    {
      id: "m-s1",
      slug: "early-bird",
      code: "EARLY",
      title: "Early-bird winter 10% off",
      description: "Book 90 days ahead.",
      validFrom: "2026-01-01T00:00:00.000Z",
      validTo: "2099-12-31T00:00:00.000Z",
      showOnSite: true,
      propertyIds: ["m-p1", "m-p2"],
    },
    {
      id: "m-s2",
      slug: "expired",
      code: "OLD",
      title: "Expired special",
      description: null,
      validFrom: null,
      validTo: "2020-01-01T00:00:00.000Z",
      showOnSite: true,
      propertyIds: ["m-p1"],
    },
  ],
}

const beach: FakeSite = {
  settings: {
    slug: "demo-beach",
    name: "Demo Beach Getaways",
    domain: "beach.example.com",
    branding: {
      logo: null,
      primaryColor: "#0e7c86",
      accentColor: "#ff6f59",
      fontPairing: "modern",
      tagline: "Steps from the Emerald Coast",
      email: "hello@beach.example.com",
      address: "500 Harbor Boulevard, Destin, FL 32541",
      social: [
        { platform: "instagram", url: "https://instagram.com/demo-beach" },
        { platform: "tiktok", url: "https://tiktok.com/@demo-beach" },
      ],
    },
    amenityPresentation: {
      filters: [
        { amenity: "a5", label: "Gulf view" },
        { amenity: "a3", group: "Resort" },
        { amenity: "a4" },
      ],
      hidden: ["a2", "a6"],
    },
    propertyTypeLabels: {
      labels: [{ propertyType: "t2", label: "Beach condo" }],
    },
    stayPolicyDefaults: {
      checkIn: "16:00",
      checkOut: "10:00",
      houseRules: "No pets on the beach walkover.",
      cancellationPolicy: null,
      minimumAge: 25,
    },
    legacyUrls: { propertyPattern: "property-details", redirects: [] },
  },
  locations: [
    {
      id: "b-l1",
      name: "Destin",
      slug: "destin",
      level: "destination",
      parentId: null,
      visible: true,
      status: "active",
      description: "Emerald Coast beaches.",
    },
    {
      id: "b-l2",
      name: "Crystal Beach",
      slug: "crystal-beach",
      level: "area",
      parentId: "b-l1",
      visible: true,
      status: "active",
      description: null,
    },
    {
      id: "b-l3",
      name: "Long Beach Resort",
      slug: "long-beach-resort",
      level: "complex",
      parentId: "b-l2",
      visible: true,
      status: "active",
      description: "Gulf-front Complex with two pools.",
      complex: {
        address: "1040 Highway 98 East, Destin, FL",
        sharedAmenityIds: ["a3", "a5"],
      },
    },
  ],
  properties: properties("b", [
    ["Long Beach 101", "b-l3", "t2", ["a3", "a5", "a4"], 2, 2, 6, false],
    ["Long Beach 702", "b-l3", "t2", ["a3", "a5", "a4"], 3, 2, 8, false],
    ["Sea Oats Cottage", "b-l2", "t3", ["a4"], 3, 2.5, 8, true],
    ["Dune House", "b-l2", "t3", ["a3", "a1", "a4"], 5, 5, 16, true],
    ["Harbor Townhome", "b-l1", "t4", ["a4"], 3, 2.5, 8, false],
    ["Sandpiper Condo", "b-l1", "t2", ["a3", "a5"], 1, 1, 4, false],
    ["Pelican Place", "b-l2", "t3", ["a3", "a4"], 4, 3, 12, true],
    ["Gone Fishing", "b-l1", "t3", ["a4"], 2, 1, 4, true, "withdrawn"],
  ]),
  curatedLists: [
    {
      id: "b-c1",
      slug: "pet-friendly-destin",
      title: "Pet-friendly Destin rentals",
      description: null,
      rule: { locationId: "b-l1", petsAllowed: true },
      status: "published",
    },
  ],
  pages: [
    {
      id: "b-pg1",
      title: "Home",
      path: "/",
      blocks: [{ blockType: "hero", heading: "Steps from the Gulf" }],
      status: "published",
    },
    {
      id: "b-pg2",
      title: "About",
      path: "/about",
      blocks: [{ blockType: "richText", text: "Your Emerald Coast hosts." }],
      showInNav: true,
      navOrder: 1,
      status: "published",
    },
  ],
  guides: [
    {
      id: "b-g1",
      slug: "destin-with-kids",
      title: "Destin with kids",
      excerpt: "Calm-water beaches and rainy-day plans.",
      publishedAt: "2026-05-15T00:00:00.000Z",
      locationIds: ["b-l1"],
      status: "published",
    },
  ],
  specials: [
    {
      id: "b-s1",
      slug: "stay-7-pay-6",
      code: "SEVEN",
      title: "Stay 7 nights, pay 6",
      description: null,
      validFrom: null,
      validTo: null,
      showOnSite: true,
      propertyIds: ["b-p1", "b-p2", "b-p4"],
    },
    {
      id: "b-s2",
      slug: "hidden",
      code: "HIDDEN",
      title: "Not shown on the Site",
      description: null,
      validFrom: null,
      validTo: null,
      showOnSite: false,
      propertyIds: ["b-p1"],
    },
  ],
}

export const fakeSites: Record<string, FakeSite> = {
  "demo-mountain": mountain,
  "demo-beach": beach,
}
