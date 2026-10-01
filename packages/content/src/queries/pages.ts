import { toPagePath } from "../shared"
import type { PageDoc } from "../types"
import type { PageDocRaw } from "./docs"
import { seo } from "./map"
import { findOneDraftable, type QueryContext } from "./context"

/**
 * A published Page by URL segments ([] is Home, "/"). Blocks come as stored,
 * with relationships populated one level: Media uploads whole, Curated Lists
 * and Locations with just what a Block links to.
 */
export async function getPage(
  ctx: QueryContext,
  path: string[]
): Promise<PageDoc | null> {
  const page = await findOneDraftable<PageDocRaw>(ctx, "pages", {
    where: { path: { equals: toPagePath(path) } },
    select: {
      title: true,
      path: true,
      template: true,
      layout: true,
      seo: true,
    },
    populate: {
      "curated-lists": { title: true, slug: true, heroImage: true },
      locations: {
        name: true,
        displayName: true,
        slug: true,
        level: true,
        parent: true,
      },
    },
    depth: 1,
  })
  if (!page) return null
  return {
    id: String(page.id),
    title: page.title,
    path: page.path,
    template: page.template === "tuckIn" ? "tuckIn" : "blank",
    blocks: page.layout ?? [],
    seo: seo(page.seo, ctx.client.baseURL),
  }
}
