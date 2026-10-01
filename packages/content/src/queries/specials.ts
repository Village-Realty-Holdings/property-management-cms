import type { Where } from "../shared"
import type { SpecialDoc } from "../types"
import type { SpecialDocRaw } from "./docs"
import { special } from "./map"
import type { QueryContext } from "./context"

const specialSelect = {
  slug: true,
  code: true,
  title: true,
  summary: true,
  discountSummary: true,
  body: true,
  terms: true,
  disclaimer: true,
  heroImage: true,
  validFrom: true,
  validTo: true,
  properties: true,
}

/**
 * Shown on the Site, Active, not expired, and with a slug (the CMS gives a
 * Special its slug from its first title). A SiteReader only reads such
 * Specials anyway; the conditions are repeated so the query says what it
 * means.
 */
function onSite(now: Date): Where[] {
  return [
    { showOnSite: { equals: true } },
    { status: { equals: "active" } },
    { slug: { exists: true } },
    {
      or: [
        { validTo: { exists: false } },
        { validTo: { greater_than_equal: now.toISOString() } },
      ],
    },
  ]
}

async function findSpecials(
  ctx: QueryContext,
  where: Where[],
  limit?: number
): Promise<SpecialDoc[]> {
  const { docs } = await ctx.client.find<SpecialDocRaw>("specials", {
    where: { and: [...onSite(new Date()), ...where] },
    select: specialSelect,
    populate: { properties: { slug: true } },
    depth: 1,
    ...(limit ? { limit } : { pagination: false }),
    sort: ["validTo", "title"],
  })
  return docs
    .map((doc) => special(doc, ctx.client.baseURL))
    .filter((doc) => doc.slug)
}

/** Specials shown on the Site and not expired, ending soonest first. */
export function listSpecials(ctx: QueryContext): Promise<SpecialDoc[]> {
  return findSpecials(ctx, [])
}

/** A shown, unexpired Special by slug. */
export async function getSpecial(
  ctx: QueryContext,
  slug: string
): Promise<SpecialDoc | null> {
  if (!slug) return null
  const [doc] = await findSpecials(ctx, [{ slug: { equals: slug } }], 1)
  return doc ?? null
}

/** Shown, unexpired Specials whose eligible Properties include this one. */
export function applicableSpecials(
  ctx: QueryContext,
  propertyId: string | number
): Promise<SpecialDoc[]> {
  return findSpecials(ctx, [{ properties: { in: [propertyId] } }])
}
