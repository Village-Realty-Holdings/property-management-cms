/**
 * A Site's Amenity Presentation and Property Type labels (ADR-0013) applied
 * to the shared vocabularies. Pure; ported from apps/cms
 * src/collections/Sites/presentation.ts, with structural types so this
 * module stays free of Payload and the generated types.
 */

type ID = number | string
type Ref = ID | { id: ID } | null | undefined

/** The Amenity fields the presentation needs (a vocabulary doc or a projection of one). */
export type AmenityInput = {
  id: ID
  feedId: string
  name: string
  group?: string | null
  icon?: string | null
  status?: "active" | "withdrawn" | null
}

/** How one Amenity appears on a Site. */
export type AmenityView = {
  id: ID
  feedId: string
  /** The Site's label, else the Feed's name. */
  label: string
  /** The Site's icon key, else the Feed's. */
  icon: string | null
  /** The Site's group label, else the Feed's group. */
  group: string | null
  /** Whether the Site offers it as a search filter. */
  filter: boolean
}

/** `site.amenityPresentation`, at any depth. */
export type SitePresentation = {
  amenityPresentation?: {
    filters?:
      | {
          amenity: Ref
          label?: string | null
          icon?: string | null
          group?: string | null
        }[]
      | null
    hidden?: Ref[] | null
  } | null
}

/** `site.propertyTypeLabels`, at any depth. */
export type SitePropertyTypeLabels = {
  propertyTypeLabels?: {
    labels?: { propertyType: Ref; label?: string | null }[] | null
  } | null
}

const idOf = (ref: Ref): string | undefined =>
  ref == null ? undefined : String(typeof ref === "object" ? ref.id : ref)

/** An override wins unless it is empty. */
const pick = (override: string | null | undefined, fallback: string | null) =>
  override?.trim() ? override.trim() : fallback

/**
 * A Site's Amenity Presentation applied to `amenities` (the whole vocabulary,
 * or a Property's Amenities). Hidden and withdrawn Amenities are dropped.
 * The Site's filters come first, in the Site's order and with its label, icon
 * and group overrides; the rest follow, sorted by label, as the Feed names them.
 */
export function resolveAmenityPresentation(
  site: SitePresentation,
  amenities: readonly AmenityInput[]
): AmenityView[] {
  const presentation = site.amenityPresentation ?? {}
  const hidden = new Set(
    (presentation.hidden ?? []).map(idOf).filter((id) => id !== undefined)
  )
  const visible = new Map<string, AmenityInput>()
  for (const amenity of amenities) {
    const id = String(amenity.id)
    if (amenity.status === "withdrawn" || hidden.has(id)) continue
    visible.set(id, amenity)
  }

  const views: AmenityView[] = []
  const placed = new Set<string>()
  for (const row of presentation.filters ?? []) {
    const id = idOf(row.amenity)
    const amenity = id === undefined ? undefined : visible.get(id)
    if (!amenity || placed.has(String(amenity.id))) continue
    placed.add(String(amenity.id))
    views.push({
      id: amenity.id,
      feedId: amenity.feedId,
      label: pick(row.label, amenity.name) ?? amenity.name,
      icon: pick(row.icon, amenity.icon ?? null),
      group: pick(row.group, amenity.group ?? null),
      filter: true,
    })
  }

  const rest = [...visible.values()]
    .filter((amenity) => !placed.has(String(amenity.id)))
    .map(
      (amenity): AmenityView => ({
        id: amenity.id,
        feedId: amenity.feedId,
        label: amenity.name,
        icon: amenity.icon ?? null,
        group: amenity.group ?? null,
        filter: false,
      })
    )
    .sort((a, b) => a.label.localeCompare(b.label))

  return [...views, ...rest]
}

/** A Property Type's name on a Site: the Site's label, else the Feed's name. */
export function propertyTypeLabel(
  site: SitePropertyTypeLabels,
  propertyType: { id: ID; name: string }
): string {
  const row = (site.propertyTypeLabels?.labels ?? []).find(
    (row) => idOf(row.propertyType) === String(propertyType.id)
  )
  return pick(row?.label, propertyType.name) ?? propertyType.name
}
