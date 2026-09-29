import type {
  CollectionSlug,
  FilterOptions,
  GroupField,
  PayloadRequest,
  Where,
} from "payload"

import { sameSite } from "./sameSite"

/**
 * `filterOptions` for relationships to Site-scoped collections: only documents
 * on the same Site as the document being edited, and nothing while the Site is
 * unknown. Re-exported from `./sameSite`, the one fail-closed helper.
 */
export { sameSite }

type ID = number | string
type VocabularyField = "amenities" | "propertyTypes"

const idOf = (ref: unknown) =>
  ref && typeof ref === "object" ? (ref as { id?: unknown }).id : ref

/** The rule's saved Amenities and Property Types, once per request. */
async function savedRule(
  req: PayloadRequest,
  collection: CollectionSlug,
  id: ID
): Promise<Record<VocabularyField, ID[]>> {
  const key = `rule.saved.${collection}.${id}`
  const cached = req.context[key] as Record<VocabularyField, ID[]> | undefined
  if (cached) return cached
  const doc = (await req.payload.findByID({
    collection,
    id,
    depth: 0,
    draft: true,
    disableErrors: true,
    req,
  })) as { rule?: Partial<Record<VocabularyField, unknown[]>> } | null
  const ids = (field: VocabularyField) =>
    (doc?.rule?.[field] ?? [])
      .map((ref) => idOf(ref))
      .filter(
        (ref): ref is ID => typeof ref === "number" || typeof ref === "string"
      )
  const saved = {
    amenities: ids("amenities"),
    propertyTypes: ids("propertyTypes"),
  }
  req.context[key] = saved
  return saved
}

/**
 * Only Active Amenities or Property Types can be picked. Payload re-checks
 * `filterOptions` on every save, so the ones already saved on the rule stay
 * valid after the Feed withdraws them: a withdrawal never blocks saving the
 * Curated List.
 */
function activeVocabulary(
  collection: CollectionSlug,
  field: VocabularyField
): FilterOptions {
  return async ({ id, req }) => {
    const allowed: Where[] = [
      { status: { equals: "active" } },
      { status: { exists: false } },
    ]
    const saved =
      id == null ? [] : (await savedRule(req, collection, id))[field]
    if (saved.length > 0) allowed.push({ id: { in: saved } })
    return { or: allowed }
  }
}

type RuleFieldOptions = {
  /** Collection the rule is stored on. @default "curated-lists" */
  collection?: CollectionSlug
}

/**
 * A Curated List rule over Property Facts and Location (ADR-0003). Every set
 * condition must hold; an empty rule matches every Active Property on the
 * Site. `@workspace/content/shared` `curatedListWhere` compiles it into a
 * `where` on `properties` (see `curatedListRuleFrom` for the field mapping).
 */
export function ruleField({
  collection = "curated-lists",
}: RuleFieldOptions = {}): GroupField {
  return {
    name: "rule",
    type: "group",
    admin: {
      description:
        "Properties that match every condition set here are in the list. Members update as the Sync runs.",
    },
    fields: [
      {
        name: "location",
        type: "relationship",
        relationTo: "locations",
        filterOptions: sameSite,
        admin: {
          description: "This Location or any Location inside it.",
        },
      },
      {
        name: "amenities",
        type: "relationship",
        relationTo: "amenities",
        hasMany: true,
        filterOptions: activeVocabulary(collection, "amenities"),
        admin: { description: "Has all of these Amenities." },
      },
      {
        name: "propertyTypes",
        label: "Property Types",
        type: "relationship",
        relationTo: "property-types",
        hasMany: true,
        filterOptions: activeVocabulary(collection, "propertyTypes"),
        admin: { description: "Is any of these Property Types." },
      },
      {
        type: "row",
        fields: [
          {
            name: "minBedrooms",
            label: "Minimum bedrooms",
            type: "number",
            min: 0,
          },
          {
            name: "minSleeps",
            label: "Minimum sleeps",
            type: "number",
            min: 0,
          },
        ],
      },
      {
        name: "petsAllowed",
        label: "Pets allowed",
        type: "checkbox",
        defaultValue: false,
        admin: {
          description: "Only Properties that allow pets. Unticked: any.",
        },
      },
    ],
  }
}
