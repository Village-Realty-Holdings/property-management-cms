import { createHmac, randomBytes } from "node:crypto"

import type { Payload, Where } from "payload"

import type { Site, SiteReader, User } from "@workspace/cms-types"

import type { SiteSpec } from "./demo"
import { findOne, upsert } from "./upsert"

/** A Site's secrets from an earlier run (see SeedOutput). */
export type KnownSecrets = {
  readerKey?: string
  revalidationSecret?: string
}

const newSecret = () => randomBytes(24).toString("base64url")

/** The fields of the loaded config, loosely: enough to feature-detect. */
type ConfigField = {
  name?: string
  type: string
  options?: (string | { value: string })[]
  flattenedFields?: ConfigField[]
}

/**
 * Keeps only the keys of `value` that are fields in `fields`, recursing into
 * groups and arrays, and drops select values that aren't options. Lets the
 * seed set Site branding before and after the branding fields exist.
 */
export function fitToFields(
  value: Record<string, unknown>,
  fields: ConfigField[]
): Record<string, unknown> {
  const fitted: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    const field = fields.find((f) => f.name === key)
    if (!field || entry === undefined) continue
    if (field.type === "select" && field.options) {
      const values = field.options.map((o) =>
        typeof o === "string" ? o : o.value
      )
      if (values.includes(String(entry))) fitted[key] = entry
    } else if (field.type === "array" && Array.isArray(entry)) {
      const sub = field.flattenedFields ?? []
      fitted[key] = entry
        .map((row: Record<string, unknown>) => fitToFields(row, sub))
        .filter((row) => Object.keys(row).length > 0)
    } else if (
      (field.type === "group" || field.type === "tab") &&
      entry &&
      typeof entry === "object"
    ) {
      fitted[key] = fitToFields(
        entry as Record<string, unknown>,
        field.flattenedFields ?? []
      )
    } else if (field.type !== "ui" && field.type !== "upload") {
      fitted[key] = entry
    }
  }
  return fitted
}

function brandingFor(payload: Payload, spec: SiteSpec) {
  const fields = payload.collections.sites.config
    .flattenedFields as unknown as ConfigField[]
  const tab = fields.find((f) => f.name === "branding")
  if (!tab?.flattenedFields) return {}
  return fitToFields(spec.branding, tab.flattenedFields)
}

/** Creates or updates the Site by slug, with its settings. */
export async function seedSite(
  payload: Payload,
  spec: SiteSpec,
  known: KnownSecrets
): Promise<Site> {
  const existing = await findOne(payload, "sites", {
    slug: { equals: spec.slug },
  })
  const revalidationSecret =
    existing?.revalidationSecret || known.revalidationSecret || newSecret()
  const branding = brandingFor(payload, spec)

  const { doc } = await upsert(
    payload,
    "sites",
    { slug: { equals: spec.slug } },
    {
      name: spec.name,
      slug: spec.slug,
      domain: spec.domain,
      deploymentUrl: spec.deploymentUrl,
      revalidationSecret,
      feedAccountRef: spec.feedAccountRef,
      ...(Object.keys(branding).length > 0
        ? { branding: branding as Site["branding"] }
        : {}),
      stayPolicyDefaults: {
        checkIn: "16:00",
        checkOut: "10:00",
        minimumAge: 25,
        houseRules: spec.houseRules,
        cancellationPolicy: spec.cancellationPolicy,
      },
      moderation: { autoShowMinRating: 4 },
      legacyUrls: spec.legacyUrls,
      // Only on create: re-seeding must not drop destinations set up since.
      ...(existing ? {} : { forwarding: { destinations: [] } }),
    }
  )
  return doc
}

/**
 * The Site's SiteReader, with a stable API key: the one from an earlier
 * run's output, else one derived from the Payload secret and the Site slug.
 * Payload never returns a stored key, so it can't be reused from the DB.
 */
export async function seedReader(
  payload: Payload,
  site: Site,
  known: KnownSecrets
): Promise<{ reader: SiteReader; key: string }> {
  const where: Where = { site: { equals: site.id } }
  const key =
    known.readerKey ||
    createHmac("sha256", payload.secret)
      .update(`seed-reader:${site.slug}`)
      .digest("base64url")
      .slice(0, 32)
  const { doc } = await upsert(payload, "site-readers", where, {
    name: `${site.slug} (demo)`,
    site: site.id,
    enableAPIKey: true,
    apiKey: key,
  })
  return { reader: doc, key }
}

export const DEMO_EDITOR_EMAIL = "demo-editor@demo-mountain.localhost"

/**
 * A demo Editor assigned to `site`, for access tests. Staff sign in with
 * Entra, so the record has an unusable random password (password login is
 * break-glass only) and no Entra object ID.
 */
export async function seedEditor(payload: Payload, site: Site): Promise<User> {
  const where = { email: { equals: DEMO_EDITOR_EMAIL } }
  const existing = await findOne(payload, "users", where)
  const data = {
    email: DEMO_EDITOR_EMAIL,
    name: "Demo Editor",
    role: "editor" as const,
    superAdmin: false,
    tenants: [{ site: site.id }],
  }
  const { doc } = await upsert(
    payload,
    "users",
    where,
    existing ? data : { ...data, password: newSecret() }
  )
  return doc
}

/**
 * The Site's search-filter Amenities (site.amenityPresentation.filters), by
 * Feed ID. Runs after the Sync, which creates the shared vocabulary; Feed IDs
 * it doesn't know are skipped.
 */
export async function seedAmenityFilters(
  payload: Payload,
  site: Site,
  spec: SiteSpec
): Promise<void> {
  const { docs } = await payload.find({
    collection: "amenities",
    where: { feedId: { in: spec.amenityFilters } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const byFeedId = new Map(docs.map((doc) => [doc.feedId, doc.id]))
  const filters = spec.amenityFilters
    .map((feedId) => byFeedId.get(feedId))
    .filter((id): id is number => id !== undefined)
    .map((amenity) => ({ amenity }))
  if (filters.length === 0) return
  await payload.update({
    collection: "sites",
    id: site.id,
    data: { amenityPresentation: { filters } },
    overrideAccess: true,
    context: { skipRevalidation: true },
  })
}
