import { curatedListRuleFrom } from "../shared"
import type { CuratedListPage, CuratedListSort } from "../types"
import type { CuratedListDoc, PropertyDoc } from "./docs"
import { mediaImage, plainText, propertySummary, richText, seo } from "./map"
import {
  findOneDraftable,
  loadLocationTree,
  loadSite,
  type QueryContext,
} from "./context"
import {
  propertySort,
  ruleWhere,
  summaryPopulate,
  summarySelect,
} from "./properties"

/** Most members a Curated List page shows. */
const MAX_MEMBERS = 200

const listSorts: readonly CuratedListSort[] = [
  "featured",
  "rating",
  "sleeps",
  "bedrooms",
  "name",
]

/** A published Curated List with its members resolved from its rule (ADR-0003). */
export async function getCuratedList(
  ctx: QueryContext,
  slug: string
): Promise<CuratedListPage | null> {
  if (!slug) return null
  const [list, site, tree] = await Promise.all([
    findOneDraftable<CuratedListDoc>(ctx, "curated-lists", {
      where: { slug: { equals: slug } },
      select: {
        title: true,
        slug: true,
        intro: true,
        heroImage: true,
        rule: true,
        sort: true,
        seo: true,
      },
      depth: 1,
      populate: {
        locations: { slug: true },
        amenities: { feedId: true },
        "property-types": { feedId: true },
      },
    }),
    loadSite(ctx),
    loadLocationTree(ctx),
  ])
  if (!list) return null

  const rule = curatedListRuleFrom(list.rule)
  const sort = listSorts.includes(list.sort as CuratedListSort)
    ? (list.sort as CuratedListSort)
    : "featured"
  const members = await ctx.client.find<PropertyDoc>("properties", {
    where: await ruleWhere(ctx, rule, tree),
    select: summarySelect,
    populate: summaryPopulate,
    depth: 1,
    limit: MAX_MEMBERS,
    sort: propertySort(sort),
  })

  const baseURL = ctx.client.baseURL
  const intro = richText(list.intro)
  return {
    id: String(list.id),
    slug: list.slug ?? slug,
    title: list.title,
    description: plainText(intro),
    intro,
    heroImage: mediaImage(list.heroImage, baseURL, list.title),
    rule,
    sort,
    properties: members.docs.map((doc) =>
      propertySummary(doc, { site, tree, baseURL })
    ),
    seo: seo(list.seo, baseURL),
  }
}
