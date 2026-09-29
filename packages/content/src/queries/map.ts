import {
  propertyTypeLabel,
  resolveAmenityPresentation,
  type AmenityInput,
} from "../shared"
import type {
  Amenity,
  Image,
  LocationRef,
  PropertySummary,
  PropertyType,
  RichText,
  RichTextNode,
  Seo,
  SpecialDoc,
} from "../types"
import type {
  AmenityDoc,
  ID,
  LocationDoc,
  MediaDoc,
  PropertyDoc,
  PropertyTypeDoc,
  Ref,
  SeoGroup,
  SiteDoc,
  SpecialDocRaw,
} from "./docs"

/**
 * Pure mapping from CMS documents to the site-facing shapes in ../types.
 * Editorial Content wins, Feed text fills in (ADR-0002).
 */

export function idOf(ref: Ref<object>): string | undefined {
  if (ref === null || ref === undefined || ref === "") return undefined
  return String(typeof ref === "object" ? (ref as { id: ID }).id : ref)
}

export function idsOf(refs: readonly Ref<object>[] | null | undefined) {
  return (refs ?? []).map(idOf).filter((id): id is string => id !== undefined)
}

/** The populated document of a relationship, or undefined when it's an ID. */
export function docOf<T extends object>(
  ref: Ref<T>
): (T & { id: ID }) | undefined {
  return ref && typeof ref === "object" ? ref : undefined
}

/** Trimmed text, or null when empty. */
export function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** An absolute URL: the CMS serves local uploads at relative `/api/media/...`. */
export function absoluteUrl(url: string, baseURL: string): string {
  return url.startsWith("/") && !url.startsWith("//") ? `${baseURL}${url}` : url
}

/** A populated Media upload as an Image; null for an unpopulated or missing one. */
export function mediaImage(
  ref: Ref<MediaDoc>,
  baseURL: string,
  fallbackAlt = ""
): Image | null {
  const media = docOf(ref)
  if (!media?.url) return null
  return withSize(
    {
      url: absoluteUrl(media.url, baseURL),
      alt: text(media.alt) ?? fallbackAlt,
    },
    media.width,
    media.height
  )
}

function withSize(
  image: Image,
  width: number | null | undefined,
  height: number | null | undefined
): Image {
  if (typeof width === "number") image.width = width
  if (typeof height === "number") image.height = height
  return image
}

export function seo(group: SeoGroup | undefined, baseURL: string): Seo {
  return {
    title: text(group?.title),
    description: text(group?.description),
    image: mediaImage(group?.image, baseURL),
  }
}

/** Lexical rich text as plain text: paragraphs separated by a blank line. */
export function plainText(
  richText: RichText | null | undefined
): string | null {
  if (!richText?.root) return null
  const blocks = (richText.root.children ?? []).map(nodeText)
  return text(blocks.filter((block) => block.trim()).join("\n\n"))
}

function nodeText(node: RichTextNode): string {
  if (typeof node.text === "string") return node.text
  if (node.type === "linebreak") return "\n"
  const separator = node.type === "list" ? "\n" : ""
  return (node.children ?? []).map(nodeText).join(separator)
}

/** Rich text with some text in it, else null. */
export function richText(value: RichText | null | undefined): RichText | null {
  return value && plainText(value) ? value : null
}

/** A Site's view of some Amenities (hidden and withdrawn ones dropped). */
export function amenities(
  site: SiteDoc,
  refs: readonly Ref<AmenityDoc>[] | null | undefined
): Amenity[] {
  const docs = (refs ?? [])
    .map((ref) => docOf(ref))
    .filter((doc): doc is AmenityDoc => doc !== undefined)
  return presentAmenities(site, docs)
}

export function presentAmenities(
  site: SiteDoc,
  docs: readonly AmenityInput[]
): Amenity[] {
  return resolveAmenityPresentation(site, docs).map((view) => ({
    id: String(view.id),
    feedId: view.feedId,
    name: view.label,
    group: view.group,
    icon: view.icon,
    filter: view.filter,
  }))
}

export function propertyType(
  site: SiteDoc,
  ref: Ref<PropertyTypeDoc>
): PropertyType | null {
  const doc = docOf(ref)
  if (!doc) return null
  return {
    id: String(doc.id),
    feedId: doc.feedId,
    name: propertyTypeLabel(site, doc),
  }
}

/** The Location display name: `displayName`, else the Feed name. */
export function locationName(doc: LocationDoc): string {
  return text(doc.displayName) ?? text(doc.name) ?? ""
}

/**
 * The Site's visible Locations (a SiteReader reads only Active, visible
 * ones), for paths, breadcrumbs, children and descendants. A Location whose
 * parent isn't visible has no path: it can't be reached on the Site.
 */
export class LocationTree {
  private readonly byId = new Map<string, LocationDoc>()
  private readonly childIds = new Map<string, string[]>()

  constructor(docs: readonly LocationDoc[]) {
    for (const doc of docs) this.byId.set(String(doc.id), doc)
    for (const doc of docs) {
      const parent = idOf(doc.parent)
      if (parent === undefined) continue
      const siblings = this.childIds.get(parent) ?? []
      siblings.push(String(doc.id))
      this.childIds.set(parent, siblings)
    }
  }

  get(id: string | undefined): LocationDoc | undefined {
    return id === undefined ? undefined : this.byId.get(id)
  }

  /** Root first, the Location itself last; null when unreachable. */
  chain(id: string | undefined): LocationDoc[] | null {
    const chain: LocationDoc[] = []
    const seen = new Set<string>()
    let current = this.get(id)
    while (current) {
      const currentId = String(current.id)
      if (seen.has(currentId) || !text(current.slug)) return null
      seen.add(currentId)
      chain.unshift(current)
      const parent = idOf(current.parent)
      if (parent === undefined) return chain
      current = this.byId.get(parent)
    }
    return null
  }

  ref(id: string | undefined): LocationRef | null {
    const chain = this.chain(id)
    const doc = chain?.at(-1)
    if (!chain || !doc) return null
    return toRef(doc, chain)
  }

  /** Reachable child Locations, by name. */
  children(id: string): LocationRef[] {
    return (this.childIds.get(id) ?? [])
      .map((childId) => this.ref(childId))
      .filter((ref): ref is LocationRef => ref !== null)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  /** Every Location below `id`, at any depth (not `id` itself). */
  descendants(id: string): string[] {
    const found: string[] = []
    const seen = new Set([id])
    const queue = [id]
    while (queue.length > 0) {
      for (const child of this.childIds.get(queue.shift()!) ?? []) {
        if (seen.has(child)) continue
        seen.add(child)
        found.push(child)
        queue.push(child)
      }
    }
    return found
  }

  /** The Location at this slug path, root to leaf; null unless the whole chain matches. */
  findByPath(path: readonly string[]): LocationDoc[] | null {
    if (path.length === 0) return null
    const leaves = [...this.byId.values()].filter(
      (doc) => doc.slug === path.at(-1)
    )
    for (const leaf of leaves) {
      const chain = this.chain(String(leaf.id))
      if (
        chain &&
        chain.length === path.length &&
        chain.every((doc, i) => doc.slug === path[i])
      ) {
        return chain
      }
    }
    return null
  }
}

function toRef(doc: LocationDoc, chain: readonly LocationDoc[]): LocationRef {
  return {
    id: String(doc.id),
    name: locationName(doc),
    slug: doc.slug ?? "",
    level: doc.level ?? null,
    path: chain.map((l) => l.slug ?? ""),
  }
}

export function chainRefs(chain: readonly LocationDoc[]): LocationRef[] {
  return chain.map((doc, i) => toRef(doc, chain.slice(0, i + 1)))
}

export type SummaryContext = {
  site: SiteDoc
  tree: LocationTree
  baseURL: string
}

type FeedPhoto = NonNullable<PropertyDoc["photos"]>[number]

/** A Feed photo (a URL on the Feed's host, never Media; ADR-0008). */
export function feedPhoto(photo: FeedPhoto, name: string, baseURL: string) {
  return withSize(
    { url: absoluteUrl(photo.url, baseURL), alt: text(photo.caption) ?? name },
    photo.width,
    photo.height
  )
}

/** The first Feed photo, else the SEO image. */
function primaryImage(doc: PropertyDoc, name: string, baseURL: string) {
  const photo = doc.photos?.[0]
  if (photo?.url) return feedPhoto(photo, name, baseURL)
  return mediaImage(doc.seo?.image, baseURL, name)
}

export function propertyName(doc: PropertyDoc): string {
  return text(doc.headline) ?? text(doc.feedName) ?? doc.slug ?? doc.feedId
}

export function propertySummary(
  doc: PropertyDoc,
  { site, tree, baseURL }: SummaryContext
): PropertySummary {
  const name = propertyName(doc)
  return {
    id: String(doc.id),
    feedId: doc.feedId,
    slug: doc.slug ?? "",
    name,
    summary: text(doc.summary) ?? text(doc.feedDescription),
    featured: doc.featured === true,
    location: tree.ref(idOf(doc.location)),
    propertyType: propertyType(site, doc.propertyType),
    bedrooms: doc.bedrooms ?? null,
    bathrooms: doc.bathrooms ?? null,
    sleeps: doc.sleeps ?? null,
    petsAllowed: doc.petsAllowed === true,
    rating: doc.rating ?? null,
    reviewCount: doc.reviewCount ?? 0,
    image: primaryImage(doc, name, baseURL),
  }
}

export function special(doc: SpecialDocRaw, baseURL: string): SpecialDoc {
  const code = text(doc.code)
  return {
    id: String(doc.id),
    slug: doc.slug ?? "",
    code,
    title: text(doc.title) ?? text(doc.discountSummary) ?? code ?? "",
    description: text(doc.summary) ?? text(doc.discountSummary),
    body: richText(doc.body),
    terms: text(doc.terms),
    disclaimer: text(doc.disclaimer),
    heroImage: mediaImage(doc.heroImage, baseURL),
    validFrom: doc.validFrom ?? null,
    validTo: doc.validTo ?? null,
    propertyIds: idsOf(doc.properties),
  }
}
