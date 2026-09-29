import type { CollectionSlug } from "payload"

/**
 * Sections (CONTEXT.md): the parts of the CMS a Site can go without. Stored
 * on the Site as `sections.<name>` checkboxes, all on by default. Turning a
 * Section off hides it in the admin only (nav, dashboard work queues, Site
 * Settings); access control and the API don't change. Pages, Media and Site
 * Settings are on every Site.
 */
export const sectionNames = [
  "properties",
  "inbox",
  "guides",
  "curatedLists",
] as const

export type Section = (typeof sectionNames)[number]

/** `site.sections`, as stored. A missing value counts as on. */
export type SiteSections =
  | Partial<Record<Section, boolean | null | undefined>>
  | null
  | undefined

export const sectionLabels: Record<Section, string> = {
  properties: "Properties",
  inbox: "Inbox",
  guides: "Guides",
  curatedLists: "Curated Lists",
}

/**
 * The collections each Section owns in the admin. Amenities and Property
 * Types are Awayday-wide, but only matter to a Site with Properties.
 */
export const sectionCollections: Record<Section, CollectionSlug[]> = {
  properties: [
    "properties",
    "locations",
    "specials",
    "reviews",
    "amenities",
    "property-types",
  ],
  inbox: ["submissions"],
  guides: ["guides"],
  curatedLists: ["curated-lists"],
}

export function isSectionOn(sections: SiteSections, section: Section): boolean {
  return sections?.[section] !== false
}

/** The collections hidden in the admin for a Site's Sections. */
export function hiddenCollections(sections: SiteSections): CollectionSlug[] {
  return sectionNames
    .filter((section) => !isSectionOn(sections, section))
    .flatMap((section) => sectionCollections[section])
}

/** `slugs` without the collections a Site's Sections hide. */
export function withoutHiddenCollections<T extends string>(
  slugs: readonly T[],
  sections: SiteSections
): T[] {
  const hidden = new Set<string>(hiddenCollections(sections))
  return slugs.filter((slug) => !hidden.has(slug))
}

/**
 * `admin.condition` for Site Settings that belong to a Section: shown while
 * the Site being edited has it on (Sites' form data, or a sibling's).
 */
export const whenSectionOn =
  (section: Section) =>
  (data: Partial<{ sections: SiteSections }> | undefined): boolean =>
    isSectionOn(data?.sections, section)
