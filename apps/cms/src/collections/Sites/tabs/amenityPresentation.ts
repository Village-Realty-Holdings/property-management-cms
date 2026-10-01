import type {
  ArrayFieldValidation,
  FilterOptions,
  GroupField,
  PayloadRequest,
  Where,
} from "payload"

import { adminsOnly } from "../fieldAccess"

type FilterRow = { amenity?: unknown }

const idOf = (ref: unknown) =>
  ref && typeof ref === "object" ? (ref as { id?: unknown }).id : ref

type ID = number | string

/** The filter Amenities already saved on the Site, once per request. */
async function savedFilterAmenities(req: PayloadRequest, id: ID) {
  const key = `amenityPresentation.saved.${id}`
  const cached = req.context[key] as ID[] | undefined
  if (cached) return cached
  const site = await req.payload.findByID({
    collection: "sites",
    id,
    depth: 0,
    select: { amenityPresentation: { filters: true } },
    disableErrors: true,
    req,
  })
  const ids = (site?.amenityPresentation?.filters ?? [])
    .map((row) => idOf(row.amenity) as ID | undefined)
    .filter((ref): ref is ID => ref != null)
  req.context[key] = ids
  return ids
}

/**
 * Only Active Amenities can be picked. Payload re-checks filterOptions on
 * every save, so Amenities already saved as filters stay valid after the Feed
 * withdraws them: a withdrawal never blocks saving the Site, and
 * `resolveAmenityPresentation` stops showing them.
 */
const activeAmenities: FilterOptions = async ({ id, req }) => {
  const allowed: Where[] = [
    { status: { equals: "active" } },
    { status: { exists: false } },
  ]
  const saved = id == null ? [] : await savedFilterAmenities(req, id)
  if (saved.length > 0) allowed.push({ id: { in: saved } })
  return { or: allowed }
}

/**
 * Each Amenity is a filter at most once. In the admin form `value` is the row
 * count, so the rows come from `siblingData`.
 */
const uniqueAmenities: ArrayFieldValidation = (value, { siblingData }) => {
  const rows: FilterRow[] = Array.isArray(value)
    ? (value as FilterRow[])
    : ((siblingData as { filters?: FilterRow[] } | undefined)?.filters ?? [])
  const seen = new Set<string>()
  for (const row of rows) {
    const id = idOf(row?.amenity)
    if (id == null) continue
    if (seen.has(String(id))) return "Each Amenity can be a filter only once."
    seen.add(String(id))
  }
  return true
}

/**
 * Amenity Presentation: which Amenities are search filters, and how they are
 * grouped, labelled, iconed and ordered on this Site (ADR-0013). Stored under
 * `site.amenityPresentation.*`; resolved by `resolveAmenityPresentation`
 * (../presentation.ts).
 */
export const amenityPresentationGroup: GroupField = {
  name: "amenityPresentation",
  type: "group",
  label: "Amenity Presentation",
  access: adminsOnly,
  admin: {
    description:
      "Which Amenities are search filters on this Site, and how they are grouped, labelled and ordered.",
  },
  fields: [
    {
      name: "filters",
      type: "array",
      validate: uniqueAmenities,
      labels: { singular: "Filter", plural: "Filters" },
      admin: {
        description:
          "The Amenities guests can filter by, in the order shown. Leave label, icon or group empty to use the Feed's.",
        initCollapsed: true,
      },
      fields: [
        {
          name: "amenity",
          type: "relationship",
          relationTo: "amenities",
          required: true,
          filterOptions: activeAmenities,
        },
        {
          type: "row",
          fields: [
            {
              name: "label",
              type: "text",
              admin: { description: "Replaces the Amenity's name." },
            },
            {
              name: "icon",
              type: "text",
              admin: { description: "Replaces the Feed's icon key." },
            },
            {
              name: "group",
              label: "Group label",
              type: "text",
              admin: { description: "Replaces the Feed's group." },
            },
          ],
        },
      ],
    },
    {
      name: "hidden",
      type: "relationship",
      relationTo: "amenities",
      hasMany: true,
      admin: {
        description:
          "Amenities never shown on this Site, as filters or on Properties.",
      },
    },
  ],
}
