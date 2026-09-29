import type { AmenityInput, PartialStayPolicy } from "../shared"
import type { RichText } from "../types"

/**
 * The CMS documents as the REST adapter requests them (see the `select`s in
 * ./queries). Structural subsets of packages/cms-types, declared here so the
 * adapter doesn't depend on the generated types; every field is optional
 * because `select` and access can leave any of them out.
 */

export type ID = number | string
export type Ref<T> = ID | (T & { id: ID }) | null | undefined

export type MediaDoc = {
  id: ID
  url?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
}

export type SeoGroup = {
  title?: string | null
  description?: string | null
  image?: Ref<MediaDoc>
} | null

export type AmenityDoc = AmenityInput & { id: ID }

export type PropertyTypeDoc = {
  id: ID
  feedId: string
  name: string
  status?: "active" | "withdrawn" | null
}

export type SiteDoc = {
  id: ID
  name: string
  slug: string
  domain?: string | null
  client?: { name?: string | null; website?: string | null } | null
  customVariables?: { key?: string | null; value?: string | null }[] | null
  branding?: {
    logo?: Ref<MediaDoc>
    primaryColor?: string | null
    accentColor?: string | null
    fontPairing?: string | null
    tagline?: string | null
    phone?: string | null
    email?: string | null
    address?: string | null
    social?: { platform?: string | null; url?: string | null }[] | null
  } | null
  amenityPresentation?: {
    filters?:
      | {
          amenity: Ref<AmenityDoc>
          label?: string | null
          icon?: string | null
          group?: string | null
        }[]
      | null
    hidden?: Ref<AmenityDoc>[] | null
  } | null
  propertyTypeLabels?: {
    labels?:
      | { propertyType: Ref<PropertyTypeDoc>; label?: string | null }[]
      | null
  } | null
  stayPolicyDefaults?: PartialStayPolicy | null
  legacyUrls?: {
    propertyPattern?: string | null
    redirects?: { from?: string | null; to?: string | null }[] | null
  } | null
}

export type LocationDoc = {
  id: ID
  name?: string | null
  displayName?: string | null
  slug?: string | null
  level?: "destination" | "area" | "complex" | null
  parent?: Ref<LocationDoc>
  intro?: RichText | null
  heroImage?: Ref<MediaDoc>
  complex?: {
    address?: string | null
    sharedAmenities?: Ref<AmenityDoc>[] | null
    checkInInfo?: RichText | null
    housekeeping?: RichText | null
    feeNotes?: RichText | null
  } | null
  seo?: SeoGroup
}

export type PropertyDoc = {
  id: ID
  feedId: string
  slug?: string | null
  status?: "active" | "withdrawn"
  featured?: boolean | null
  feedName?: string | null
  headline?: string | null
  summary?: string | null
  feedDescription?: string | null
  description?: RichText | null
  highlights?: { text?: string | null }[] | null
  location?: Ref<LocationDoc>
  propertyType?: Ref<PropertyTypeDoc>
  amenities?: Ref<AmenityDoc>[] | null
  bedrooms?: number | null
  bathrooms?: number | null
  sleeps?: number | null
  petsAllowed?: boolean | null
  rating?: number | null
  reviewCount?: number | null
  onlineBookable?: boolean | null
  virtualTourUrl?: string | null
  photos?:
    | {
        url: string
        caption?: string | null
        width?: number | null
        height?: number | null
      }[]
    | null
  address?: {
    line1?: string | null
    city?: string | null
    region?: string | null
    postalCode?: string | null
    country?: string | null
  } | null
  geo?: { lat?: number | null; lng?: number | null } | null
  rooms?:
    | {
        name?: string | null
        sleeps?: number | null
        beds?: { type: string; count?: number | null }[] | null
      }[]
    | null
  stayPolicy?: PartialStayPolicy | null
  seo?: SeoGroup
}

export type ReviewDoc = {
  id: ID
  rating?: number | null
  title?: string | null
  body?: string | null
  guestName?: string | null
  stayDate?: string | null
  managerResponse?: string | null
}

export type SpecialDocRaw = {
  id: ID
  slug?: string | null
  code?: string | null
  title?: string | null
  summary?: string | null
  discountSummary?: string | null
  body?: RichText | null
  terms?: string | null
  disclaimer?: string | null
  heroImage?: Ref<MediaDoc>
  validFrom?: string | null
  validTo?: string | null
  properties?: Ref<{ id: ID }>[] | null
}

export type CuratedListDoc = {
  id: ID
  slug?: string | null
  title: string
  intro?: RichText | null
  heroImage?: Ref<MediaDoc>
  rule?: {
    location?: Ref<{ id: ID }>
    amenities?: Ref<{ id: ID }>[] | null
    propertyTypes?: Ref<{ id: ID }>[] | null
    minBedrooms?: number | null
    minSleeps?: number | null
    petsAllowed?: boolean | null
  } | null
  sort?: string | null
  seo?: SeoGroup
}

export type PageDocRaw = {
  id: ID
  title: string
  path: string
  showInNav?: boolean | null
  navOrder?: number | null
  template?: string | null
  layout?: ({ blockType: string } & Record<string, unknown>)[] | null
  seo?: SeoGroup
}

export type GuideDocRaw = {
  id: ID
  slug?: string | null
  title: string
  excerpt?: string | null
  publishedAt?: string | null
  heroImage?: Ref<MediaDoc>
  body?: RichText | null
  locations?: Ref<{ id: ID }>[] | null
  properties?: Ref<{ id: ID }>[] | null
  seo?: SeoGroup
}
