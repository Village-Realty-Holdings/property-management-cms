import type {
  CuratedListRule,
  LegacyPropertyPattern,
  LegacyRedirect,
  LegacyUrlSettings,
  StayPolicy,
  VariableValues,
} from "./shared"

/**
 * Site-facing content shapes returned by `@workspace/content`. They are not
 * Payload documents: the adapter maps CMS docs onto these. IDs are strings.
 * Everything here is for the deployment's own Site; the Site never appears
 * in the interface (ADR-0007, ADR-0010).
 */

export type { StayPolicy, VariableValues }
export type { LegacyPropertyPattern, LegacyRedirect, LegacyUrlSettings }

export type Paginated<T> = {
  docs: T[]
  totalDocs: number
  page: number
  totalPages: number
  limit: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type Image = {
  url: string
  alt: string
  width?: number
  height?: number
}

/**
 * Lexical rich text as stored by the CMS (`{ root: { children: [...] } }`).
 * Render it with a Lexical renderer; `description`-style string fields next
 * to it carry its plain text.
 */
export type RichText = {
  root: {
    type: string
    children: RichTextNode[]
    [k: string]: unknown
  }
  [k: string]: unknown
}

export type RichTextNode = {
  type: string
  text?: string
  children?: RichTextNode[]
  [k: string]: unknown
}

export type Seo = {
  title: string | null
  description: string | null
  image: Image | null
}

export type LocationLevel = "destination" | "area" | "complex"

export type LocationRef = {
  id: string
  /** The display name, else the Feed name. */
  name: string
  slug: string
  level: LocationLevel | null
  /** Slugs from the root Location down to this one; the URL path. */
  path: string[]
}

export type Amenity = {
  id: string
  feedId: string
  /** The Site's label (Amenity Presentation), else the shared name. */
  name: string
  group: string | null
  /** The Site's icon key, else the Feed's. */
  icon: string | null
  /** Whether the Site offers it as a search filter. */
  filter: boolean
}

export type PropertyType = {
  id: string
  feedId: string
  /** The Site's label (Property Type labels), else the shared name. */
  name: string
}

/** A Property in lists, search results and carousels. Active only. */
export type PropertySummary = {
  id: string
  feedId: string
  slug: string
  /** Editorial headline, else the Feed name (ADR-0002). */
  name: string
  /** Editorial summary, else the Feed description. */
  summary: string | null
  featured: boolean
  location: LocationRef | null
  propertyType: PropertyType | null
  bedrooms: number | null
  bathrooms: number | null
  sleeps: number | null
  petsAllowed: boolean
  rating: number | null
  reviewCount: number
  image: Image | null
}

export type Review = {
  id: string
  rating: number | null
  body: string | null
  title: string | null
  guestName: string | null
  stayDate: string | null
  managerResponse: string | null
}

export type Room = {
  name: string | null
  sleeps: number | null
  beds: { type: string; count: number }[]
}

export type Address = {
  line1: string | null
  city: string | null
  region: string | null
  postalCode: string | null
  country: string | null
}

export type PropertyDetail = PropertySummary & {
  /** Visible on the Site, in the Site's Amenity Presentation order. */
  amenities: Amenity[]
  /** Editorial description as plain text, falling back to the Feed's text (ADR-0002). */
  description: string | null
  /** The Editorial description as rich text; null when empty (use `description`). */
  richDescription: RichText | null
  highlights: string[]
  photos: Image[]
  rooms: Room[]
  address: Address | null
  geo: { lat: number; lng: number } | null
  virtualTourUrl: string | null
  onlineBookable: boolean
  /** The Property's Stay Policy, filled from the Site's defaults. */
  stayPolicy: StayPolicy
  /** Shown Reviews only, newest stay first. */
  reviews: Review[]
  /** Shown, unexpired Specials that apply to this Property. */
  specials: SpecialDoc[]
  seo: Seo
}

/** Complex-only details (Location Level "complex"). */
export type ComplexDetails = {
  address: string | null
  sharedAmenities: Amenity[]
  checkInInfo: RichText | null
  housekeeping: RichText | null
  feeNotes: RichText | null
}

export type LocationPage = LocationRef & {
  /** The intro as plain text. */
  description: string | null
  intro: RichText | null
  heroImage: Image | null
  /** Set when the Location is a Complex. */
  complex: ComplexDetails | null
  /** Root first, parent last. */
  ancestors: LocationRef[]
  /** Visible child Locations. */
  children: LocationRef[]
  seo: Seo
}

export type CuratedListSort =
  | "featured"
  | "rating"
  | "sleeps"
  | "bedrooms"
  | "name"

export type CuratedListPage = {
  id: string
  slug: string
  title: string
  /** The intro as plain text. */
  description: string | null
  intro: RichText | null
  heroImage: Image | null
  rule: CuratedListRule
  sort: CuratedListSort
  /** Members resolved from the rule at read time (ADR-0003). */
  properties: PropertySummary[]
  seo: Seo
}

/**
 * A Block on a Page, as stored (`blockType` plus the Block's fields; see
 * apps/cms src/blocks). Relationships are populated one level: uploads as
 * Media documents, Curated Lists and Locations with their title/slug.
 */
export type Block = {
  blockType: string
  [field: string]: unknown
}

/** The Page Template a Page was created from (apps/cms/GLOSSARY.md "Page Template"). */
export type PageTemplate = "blank" | "tuckIn"

export type PageDoc = {
  id: string
  title: string
  template: PageTemplate
  /** Stored path: "/" for Home, "/about". */
  path: string
  blocks: Block[]
  seo: Seo
}

export type GuideDoc = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  publishedAt: string | null
  locationIds: string[]
  propertyIds: string[]
  heroImage: Image | null
  body: RichText | null
  seo: Seo
}

export type GuideFilter = {
  locationId?: string
  page?: number
  limit?: number
}

export type SpecialDoc = {
  id: string
  slug: string
  code: string | null
  /** Public title, else the Feed's discount summary, else the code. */
  title: string
  /** Public summary, else the Feed's discount summary. */
  description: string | null
  body: RichText | null
  terms: string | null
  disclaimer: string | null
  heroImage: Image | null
  validFrom: string | null
  validTo: string | null
  /** The Properties it applies to (IDs; readers only see Active ones). */
  propertyIds: string[]
}

export type NavLink = {
  label: string
  href: string
}

export type FontPairing = "classic" | "modern" | "rustic"

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "x"
  | "youtube"
  | "tiktok"

/** The Site's Branding tab (`site.branding.*`): theming tokens and contact details. */
export type Branding = {
  logo: Image | null
  /** Hex colour, e.g. "#1f4d3a". */
  primaryColor?: string
  accentColor?: string
  fontPairing?: FontPairing
  tagline?: string
  phone?: string
  email?: string
  address?: string
  social: { platform: SocialPlatform; url: string }[]
}

/** The rental company Awayday runs the Site for (apps/cms/GLOSSARY.md "Client"). */
export type Client = {
  name: string | null
  /** The Client's website, an http(s) URL. */
  url: string | null
}

/** Per-Site configuration and content (apps/cms/GLOSSARY.md "Site Settings"). */
export type SiteSettings = {
  /** The Site's key; equals the deployment's SITE. */
  slug: string
  name: string
  domain: string | null
  branding: Branding
  client: Client
  /**
   * The Site's Variables, name → value (ADR-0017): built-ins from these
   * Settings plus Custom Variables. Already applied to Pages and Guides.
   */
  variables: VariableValues
  /** Published Pages with "Show in navigation", by navigation order. */
  navigation: NavLink[]
  /** From the branding tab's phone and email. */
  contact: {
    email: string | null
    phone: string | null
  }
  /** Every Amenity the Site shows, in its Amenity Presentation order. */
  amenities: Amenity[]
  /** The Site's search filter Amenities, in its order. */
  amenityFilters: Amenity[]
  /** The shared Property Types with the Site's labels. */
  propertyTypes: PropertyType[]
  /** The Site's default Stay Policy (already applied to each PropertyDetail). */
  stayPolicyDefaults: StayPolicy
  /** How the previous website's URLs redirect to this Site's (the proxy). */
  legacyUrls: LegacyUrlSettings
}

export type SitemapEntryKind =
  | "page"
  | "property"
  | "location"
  | "curatedList"
  | "guide"
  | "special"

/** A public URL of the Site, for sitemap.xml. Published/active content only. */
export type SitemapEntry = {
  kind: SitemapEntryKind
  /** Site-relative path, e.g. "/rentals/bear-hollow-lodge". */
  path: string
  /** ISO timestamp of the last change, when known. */
  lastModified: string | null
}

/** Non-dated browse over Property Facts and Location; paginated. */
export type SearchFilter = CuratedListRule & {
  page?: number
  limit?: number
  /** Default "featured". */
  sort?: CuratedListSort
}

export type SubmissionKind = "inquiry" | "ownerLead" | "contact"

export type SubmissionInput = {
  kind: SubmissionKind
  /**
   * The form's fields, as entered. Stored as-is; `name`/`email` are taken
   * from here when not given below.
   */
  payload: Record<string, unknown>
  name?: string
  email?: string
  phone?: string
  message?: string
  /** The Property an Inquiry is about (its CMS ID). */
  propertyId?: string
  /** ISO dates (YYYY-MM-DD). */
  arrival?: string
  departure?: string
  guests?: number
  /** The page the form was sent from. */
  sourceUrl?: string
  /** Honeypot: a hidden input; anything but empty rejects the Submission. */
  website?: string
}

export type SubmissionResult = {
  id: string
}

/** What every adapter (fake, rest) implements; `src/index.ts` forwards to one. */
export type ContentAdapter = {
  getProperty(slug: string): Promise<PropertyDetail | null>
  getProperties(feedIds: string[]): Promise<PropertySummary[]>
  searchProperties(filter: SearchFilter): Promise<Paginated<PropertySummary>>
  getLocation(path: string[]): Promise<LocationPage | null>
  getCuratedList(slug: string): Promise<CuratedListPage | null>
  getPage(path: string[]): Promise<PageDoc | null>
  getGuide(slug: string): Promise<GuideDoc | null>
  listGuides(filter?: GuideFilter): Promise<Paginated<GuideDoc>>
  listSpecials(): Promise<SpecialDoc[]>
  getSpecial(slug: string): Promise<SpecialDoc | null>
  getSiteSettings(): Promise<SiteSettings>
  listSitemapEntries(): Promise<SitemapEntry[]>
  submit(input: SubmissionInput): Promise<SubmissionResult>
}
