/**
 * Curated List rules (ADR-0003): the rule shape and its compilation into a
 * Payload `where` on the `properties` collection. Pure TypeScript, shared by
 * apps/site (resolving members) and apps/cms (tests, admin previews).
 */

/**
 * A Curated List rule over Property Facts and Location. All set conditions
 * must hold; an empty rule matches every Active Property. IDs are CMS
 * document IDs.
 */
export type CuratedListRule = {
  /** The Location or any Location inside it. */
  locationId?: string
  /** Has every one of these Amenities. */
  amenityIds?: string[]
  /** Is one of these Property Types. */
  propertyTypeIds?: string[]
  minBedrooms?: number
  minSleeps?: number
  /** `true`: only Properties that allow pets. Unset or `false`: any. */
  petsAllowed?: boolean
}

/** Operators on one field, e.g. `{ equals: "active" }`. */
export type WhereField = { [operator: string]: unknown }

/**
 * Structurally a Payload `Where`, declared here so this module stays
 * Payload-free. Assignable to Payload's `Where`.
 */
export type Where = {
  /** A field's operators, or `and` / `or` with nested `Where`s. */
  [field: string]: Where[] | WhereField
}

/** @deprecated Use `Where`. */
export type WhereQuery = Where

export type CuratedListWhereOptions = {
  /**
   * Every Location inside `rule.locationId`, at any depth. The caller
   * resolves the tree; without it only Properties directly in the Location
   * match.
   */
  descendantLocationIds?: string[]
  /**
   * Required when the rule has two or more Amenities: the Properties that
   * have all of them, from `propertiesWithAllAmenities` over the documents
   * matching `curatedListPrefilter`. See `curatedListWhere`.
   */
  propertyIdsWithAllAmenities?: string[]
}

/**
 * Compiles a Curated List rule into a `where` on `properties` (field names
 * from Property Facts). It always requires `status = active`. It does not
 * constrain the Site: SiteReader access does that, and callers using
 * `overrideAccess` must add `site` themselves.
 *
 * Amenities are all-of. The Postgres adapter joins a hasMany relationship
 * once per query, so `and: [{ amenities: { in: [a] } }, { amenities: { in:
 * [b] } }]` matches nothing (verified in apps/cms
 * src/collections/curatedLists.test.ts) and there is no `all` operator. One
 * Amenity compiles to `amenities in [id]`; two or more need a first query:
 *
 *   const prefilter = curatedListPrefilter(rule, options)
 *   if (prefilter) {
 *     const { docs } = await find({ where: prefilter, select: { amenities: true }, depth: 0, pagination: false })
 *     options.propertyIdsWithAllAmenities = propertiesWithAllAmenities(docs, rule)
 *   }
 *   const where = curatedListWhere(rule, options)
 */
export function curatedListWhere(
  rule: CuratedListRule,
  options: CuratedListWhereOptions = {}
): Where {
  const amenityIds = unique(rule.amenityIds ?? [])
  const and = baseConditions(rule, options)

  if (amenityIds.length === 1) {
    and.push({ amenities: { in: amenityIds } })
  } else if (amenityIds.length > 1) {
    const ids = options.propertyIdsWithAllAmenities
    if (!ids) {
      throw new Error(
        "curatedListWhere: a rule with several Amenities needs propertyIdsWithAllAmenities (see curatedListPrefilter)"
      )
    }
    // An empty `in` would be dropped from a REST query string, matching
    // everything; `id exists false` matches nothing and survives `qs`.
    and.push(
      ids.length > 0 ? { id: { in: unique(ids) } } : { id: { exists: false } }
    )
  }

  return { and }
}

/**
 * The first query for a rule with two or more Amenities: every other
 * condition, plus any of the Amenities. `null` when not needed. Select only
 * `amenities` and pass the documents to `propertiesWithAllAmenities`.
 */
export function curatedListPrefilter(
  rule: CuratedListRule,
  options: Pick<CuratedListWhereOptions, "descendantLocationIds"> = {}
): Where | null {
  const amenityIds = unique(rule.amenityIds ?? [])
  if (amenityIds.length < 2) return null
  const and = baseConditions(rule, options)
  and.push({ amenities: { in: amenityIds } })
  return { and }
}

/** IDs of the `properties` documents that have every Amenity in the rule. */
export function propertiesWithAllAmenities(
  docs: readonly { id: string | number; amenities?: Ref[] | null }[],
  rule: Pick<CuratedListRule, "amenityIds">
): string[] {
  const required = unique(rule.amenityIds ?? [])
  return docs
    .filter((doc) => {
      const has = new Set(idsOf(doc.amenities))
      return required.every((id) => has.has(id))
    })
    .map((doc) => String(doc.id))
}

/** Every condition except Amenities. */
function baseConditions(
  rule: CuratedListRule,
  { descendantLocationIds = [] }: CuratedListWhereOptions
): Where[] {
  const and: Where[] = [{ status: { equals: "active" } }]

  if (rule.locationId) {
    const ids = unique([rule.locationId, ...descendantLocationIds])
    and.push({ location: { in: ids } })
  }

  const types = unique(rule.propertyTypeIds ?? [])
  if (types.length > 0) and.push({ propertyType: { in: types } })

  // A minimum of 0 is no minimum; `>= 0` would drop Properties with no value.
  if (isNumber(rule.minBedrooms) && rule.minBedrooms > 0) {
    and.push({ bedrooms: { greater_than_equal: rule.minBedrooms } })
  }
  if (isNumber(rule.minSleeps) && rule.minSleeps > 0) {
    and.push({ sleeps: { greater_than_equal: rule.minSleeps } })
  }

  if (rule.petsAllowed === true) and.push({ petsAllowed: { equals: true } })

  return and
}

type Ref = string | number | { id: string | number } | null | undefined

/**
 * The `rule` group as stored on a Curated List (any `depth`) to a
 * `CuratedListRule`. Relationships may be IDs or populated documents.
 */
export type CuratedListRuleFields = {
  location?: Ref
  amenities?: Ref[] | null
  propertyTypes?: Ref[] | null
  minBedrooms?: number | null
  minSleeps?: number | null
  petsAllowed?: boolean | null
}

/** Maps a Curated List's stored `rule` group to a `CuratedListRule`. */
export function curatedListRuleFrom(
  fields: CuratedListRuleFields | null | undefined
): CuratedListRule {
  const rule: CuratedListRule = {}
  if (!fields) return rule

  const location = idOf(fields.location)
  if (location) rule.locationId = location

  const amenityIds = idsOf(fields.amenities)
  if (amenityIds.length > 0) rule.amenityIds = amenityIds

  const propertyTypeIds = idsOf(fields.propertyTypes)
  if (propertyTypeIds.length > 0) rule.propertyTypeIds = propertyTypeIds

  if (isNumber(fields.minBedrooms)) rule.minBedrooms = fields.minBedrooms
  if (isNumber(fields.minSleeps)) rule.minSleeps = fields.minSleeps
  if (fields.petsAllowed === true) rule.petsAllowed = true

  return rule
}

function idOf(ref: Ref): string | undefined {
  const id = ref && typeof ref === "object" ? ref.id : ref
  return id === null || id === undefined || id === "" ? undefined : String(id)
}

function idsOf(refs: Ref[] | null | undefined): string[] {
  return unique(
    (refs ?? []).map(idOf).filter((id): id is string => id !== undefined)
  )
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)]
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}
