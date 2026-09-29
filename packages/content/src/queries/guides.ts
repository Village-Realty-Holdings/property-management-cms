import type { Where } from "../shared"
import type { GuideDoc, GuideFilter, Paginated } from "../types"
import type { GuideDocRaw } from "./docs"
import { idsOf, mediaImage, richText, seo, text } from "./map"
import {
  findOneDraftable,
  paginated,
  positive,
  type QueryContext,
} from "./context"

const guideSelect = {
  title: true,
  slug: true,
  excerpt: true,
  publishedAt: true,
  heroImage: true,
  locations: true,
  properties: true,
  seo: true,
}

function guide(doc: GuideDocRaw, baseURL: string): GuideDoc {
  return {
    id: String(doc.id),
    slug: doc.slug ?? "",
    title: doc.title,
    excerpt: text(doc.excerpt),
    publishedAt: doc.publishedAt ?? null,
    locationIds: idsOf(doc.locations),
    propertyIds: idsOf(doc.properties),
    heroImage: mediaImage(doc.heroImage, baseURL, doc.title),
    body: richText(doc.body),
    seo: seo(doc.seo, baseURL),
  }
}

/** A Guide by slug, with its body: published, or its latest Draft in a Preview. */
export async function getGuide(
  ctx: QueryContext,
  slug: string
): Promise<GuideDoc | null> {
  if (!slug) return null
  const doc = await findOneDraftable<GuideDocRaw>(ctx, "guides", {
    where: { slug: { equals: slug } },
    select: { ...guideSelect, body: true },
    // Relationships stay IDs; only uploads are populated.
    populate: { locations: { slug: true }, properties: { slug: true } },
    depth: 1,
  })
  return doc ? guide(doc, ctx.client.baseURL) : null
}

/**
 * Published Guides, newest first (without bodies). Published even in a
 * Preview: lists show what's live.
 */
export async function listGuides(
  ctx: QueryContext,
  filter: GuideFilter = {}
): Promise<Paginated<GuideDoc>> {
  const where: Where = filter.locationId
    ? { locations: { in: [filter.locationId] } }
    : {}
  const found = await ctx.client.find<GuideDocRaw>("guides", {
    where,
    select: guideSelect,
    populate: { locations: { slug: true }, properties: { slug: true } },
    depth: 1,
    page: positive(filter.page, 1),
    limit: Math.min(positive(filter.limit, 12), 100),
    sort: ["-publishedAt", "-createdAt"],
  })
  return paginated(found, (doc) => guide(doc, ctx.client.baseURL))
}
