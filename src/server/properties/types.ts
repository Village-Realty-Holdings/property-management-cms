/**
 * Provider-neutral property model.
 *
 * Shaped after what a PMS sync (Track, Streamline) ends up storing: identity,
 * geo and node, capacity, two-level amenities, ordered photos, cached rate
 * summaries, reviews and promos. Blocks only ever talk to a `PropertyProvider`,
 * so swapping the mock for a real adapter is a one-file change.
 */

export type PropertyNodeType = 'region' | 'area' | 'complex' | 'building'

export type PropertyNode = {
  id: string
  name: string
  type: PropertyNodeType
  parentId: string | null
}

export type AmenityGroup = {
  id: string
  name: string
  amenities: Amenity[]
}

export type Amenity = {
  id: string
  name: string
  /** Icon key matching the Amenities block icon set where one exists. */
  icon?: string
  hideOnSearch?: boolean
}

export type PropertyPhoto = {
  url: string
  caption?: string
  order: number
}

export type PropertyType = 'condo' | 'house' | 'townhome' | 'cabin' | 'villa'

export type Property = {
  /** PMS unit code, stable across syncs. */
  code: string
  name: string
  slug: string
  headline?: string
  subtitle?: string
  featured: boolean
  active: boolean
  nodeId: string
  address: {
    street?: string
    city: string
    state: string
    zip?: string
    country: string
  }
  lat: number
  lng: number
  bedrooms: number
  /** Half baths count as 0.5. */
  bathrooms: number
  sleeps: number
  petsAllowed: boolean
  maxPets?: number
  type: PropertyType
  shortDescription: string
  description: string
  reasonsToBook?: string[]
  tourUrl?: string
  videoTourUrl?: string
  amenityIds: string[]
  photos: PropertyPhoto[]
  rates: {
    /** Average nightly rate over the next 90 days, fees folded in. */
    avgNightly: number
    min: number
    max: number
    currency: string
    minStay: number
  }
  /** Nights available in the next 90 days. */
  availabilityCount: number
  rating?: number
  reviewCount: number
  checkIn?: string
  checkOut?: string
}

export type Review = {
  id: string
  propertyCode: string
  author: string
  rating: number
  title?: string
  body: string
  stayedAt: string
  response?: string
}

export type Promo = {
  id: string
  code?: string
  name: string
  description: string
  /** e.g. "15% off", "Stay 4 pay 3". */
  offer: string
  startsAt: string
  endsAt: string
  minNights?: number
  propertyCodes?: string[]
  nodeId?: string
}

export type PropertySort =
  | 'featured'
  | 'random'
  | 'name-asc'
  | 'name-desc'
  | 'bedrooms-asc'
  | 'bedrooms-desc'
  | 'sleeps-asc'
  | 'sleeps-desc'
  | 'rate-asc'
  | 'rate-desc'
  | 'rating-desc'
  | 'availability-desc'

export type PropertyQuery = {
  arrival?: string
  departure?: string
  /** Minimum sleeps. */
  guests?: number
  /** Minimum bedrooms ("N+"). */
  bedrooms?: number
  bathrooms?: number
  pets?: boolean
  /** Expanded to descendant nodes. */
  nodeId?: string
  types?: PropertyType[]
  /** Every listed amenity must be present. */
  amenityIds?: string[]
  featuredOnly?: boolean
  codes?: string[]
  sort?: PropertySort
  /** Stable seed for `random` so a page renders the same order across requests. */
  seed?: string
  limit?: number
  offset?: number
}

export type PropertySearchResult = {
  items: Property[]
  total: number
}

export type ReviewQuery = {
  propertyCode?: string
  minRating?: number
  limit?: number
}

export type PromoQuery = {
  propertyCode?: string
  nodeId?: string
  /** ISO date, defaults to today. */
  on?: string
  limit?: number
}

export interface PropertyProvider {
  readonly name: string
  search(query: PropertyQuery): Promise<PropertySearchResult>
  getByCode(code: string): Promise<Property | null>
  listNodes(): Promise<PropertyNode[]>
  listAmenityGroups(): Promise<AmenityGroup[]>
  listReviews(query?: ReviewQuery): Promise<Review[]>
  listPromos(query?: PromoQuery): Promise<Promo[]>
}
