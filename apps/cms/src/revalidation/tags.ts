import type {
  Amenity,
  CuratedList,
  Guide,
  Location,
  Media,
  Page,
  Property,
  PropertyType,
  Review,
  Site,
  Special,
} from "@workspace/cms-types"
import {
  cacheTags,
  variablesChanged,
  variableValuesFrom,
  type CacheTag,
} from "@workspace/content/shared"

import { relationId, type TagsFor, type TagsForArgs } from "./hooks"

const {
  curatedList,
  curatedLists,
  guide,
  guides,
  location,
  locations,
  page,
  pages,
  properties,
  property,
  siteSettings,
  specials,
} = cacheTags

/** The document and, on update, its previous version. */
const versions = <T>({ doc, previousDoc }: TagsForArgs<T>): T[] =>
  previousDoc === undefined ? [doc] : [doc, previousDoc]

/** `build(value)` for each non-empty `value`. */
function each<T>(
  values: (T | null | undefined)[],
  build: (value: T) => CacheTag
): CacheTag[] {
  return values.flatMap((value) =>
    value === null || value === undefined || value === "" ? [] : [build(value)]
  )
}

/**
 * The cache tags each collection's changes affect (ADR-0009). Attach with
 * `revalidationHooks(tagPresets.<collection>)`. Per-document tags cover both
 * the new and the previous value (a changed slug or path revalidates the old
 * URL too). Any Property change invalidates every Curated List (ADR-0003).
 */
export const tagPresets = {
  properties: ((args) => {
    const docs = versions(args)
    return [
      ...each(
        docs.map((doc) => doc.slug),
        property
      ),
      properties,
      curatedLists,
      ...each(
        docs.map((doc) => relationId(doc.location)),
        location
      ),
    ]
  }) satisfies TagsFor<Property>,

  locations: ((args) => [
    ...each(
      versions(args).map((doc) => doc.id),
      location
    ),
    locations,
    properties,
  ]) satisfies TagsFor<Location>,

  pages: ((args) => [
    ...each(
      versions(args).map((doc) => doc.path),
      page
    ),
    pages,
  ]) satisfies TagsFor<Page>,

  guides: ((args) => [
    ...each(
      versions(args).map((doc) => doc.slug),
      guide
    ),
    guides,
  ]) satisfies TagsFor<Guide>,

  "curated-lists": ((args) => [
    ...each(
      versions(args).map((doc) => doc.slug),
      curatedList
    ),
    curatedLists,
  ]) satisfies TagsFor<CuratedList>,

  specials: (() => [specials]) satisfies TagsFor<Special>,

  /**
   * A Review shows on its Property's page and changes the Property's Rating,
   * which Curated List and Location pages show too.
   */
  reviews: (async (args) => {
    const refs = await Promise.all(
      versions(args).map((doc) => propertyRef(args.req, doc.property))
    )
    return [
      ...each(
        refs.map((ref) => ref?.slug),
        property
      ),
      properties,
      curatedLists,
      ...each(
        refs.map((ref) => relationId(ref?.location)),
        location
      ),
    ]
  }) satisfies TagsFor<Review>,

  /**
   * Site Settings; and every Page and Guide when a Variable's value changed,
   * since the Site resolves Variables into them (ADR-0017).
   */
  sites: (({ doc, previousDoc }) =>
    previousDoc &&
    variablesChanged(variableValuesFrom(doc), variableValuesFrom(previousDoc))
      ? [siteSettings, pages, guides]
      : [siteSettings]) satisfies TagsFor<Site>,

  /** Awayday-wide vocabularies: every Site's Properties and filters. */
  amenities: (() => [properties, siteSettings]) satisfies TagsFor<Amenity>,
  "property-types": (() => [
    properties,
    siteSettings,
  ]) satisfies TagsFor<PropertyType>,

  /** Images are revalidated through the documents that reference them. */
  media: (() => []) satisfies TagsFor<Media>,
}

async function propertyRef(
  req: TagsForArgs<unknown>["req"],
  value: Review["property"]
): Promise<Pick<Property, "slug" | "location"> | null | undefined> {
  if (value && typeof value === "object") return value
  if (value === null || value === undefined) return undefined
  return req.payload.findByID({
    collection: "properties",
    id: value,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    select: { slug: true, location: true },
    req,
  })
}
