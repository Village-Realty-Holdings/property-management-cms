import type { LocationPage } from "../types"
import type { LocationDoc } from "./docs"
import {
  amenities,
  chainRefs,
  mediaImage,
  plainText,
  richText,
  seo,
  text,
} from "./map"
import {
  amenityPopulate,
  loadLocationTree,
  loadSite,
  type QueryContext,
} from "./context"

/**
 * A visible Location by its slug path (root to leaf), with ancestors and
 * child Locations. Every segment must match the Location chain; a Location
 * under a hidden parent can't be reached.
 */
export async function getLocation(
  ctx: QueryContext,
  path: string[]
): Promise<LocationPage | null> {
  const tree = await loadLocationTree(ctx)
  const chain = tree.findByPath(path)
  const leaf = chain?.at(-1)
  if (!chain || !leaf) return null

  const [site, found] = await Promise.all([
    loadSite(ctx),
    ctx.client.find<LocationDoc>("locations", {
      where: { id: { equals: leaf.id } },
      select: {
        intro: true,
        heroImage: true,
        complex: true,
        seo: true,
      },
      populate: { amenities: amenityPopulate },
      depth: 1,
      limit: 1,
    }),
  ])
  const doc = found.docs[0]
  if (!doc) return null

  const baseURL = ctx.client.baseURL
  const refs = chainRefs(chain)
  const self = refs.at(-1)!
  const intro = richText(doc.intro)
  const complex = leaf.level === "complex" ? (doc.complex ?? {}) : null

  return {
    ...self,
    description: plainText(intro),
    intro,
    heroImage: mediaImage(doc.heroImage, baseURL, self.name),
    complex: complex && {
      address: text(complex.address),
      sharedAmenities: amenities(site, complex.sharedAmenities),
      checkInInfo: richText(complex.checkInInfo),
      housekeeping: richText(complex.housekeeping),
      feeNotes: richText(complex.feeNotes),
    },
    ancestors: refs.slice(0, -1),
    children: tree.children(self.id),
    seo: seo(doc.seo, baseURL),
  }
}
