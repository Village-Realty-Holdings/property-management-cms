import { propertyPath, type Where } from "../shared"
import type { SitemapEntry, SitemapEntryKind } from "../types"
import type { LocationDoc } from "./docs"
import { LocationTree, text } from "./map"
import type { QueryContext } from "./context"

/**
 * Every public URL of the Site, for sitemap.xml. Published/active content
 * only, whatever the draft flag: a sitemap never lists Drafts. The conditions
 * spell out what the Site shows, whoever the client reads as.
 */

type Stamped = { id: number | string; updatedAt?: string | null }
type SlugDoc = Stamped & { slug?: string | null }
type PathDoc = Stamped & { path?: string | null }

const stamp = (doc: Stamped) => doc.updatedAt ?? null

async function findAll<T>(
  ctx: QueryContext,
  collection: string,
  where: Where,
  select: Record<string, true>
): Promise<T[]> {
  const { docs } = await ctx.client.find<T>(collection, {
    where,
    select: { ...select, updatedAt: true },
    depth: 0,
    pagination: false,
  })
  return docs
}

function bySlug(
  docs: SlugDoc[],
  kind: SitemapEntryKind,
  toPath: (slug: string) => string
): SitemapEntry[] {
  return docs.flatMap((doc) => {
    const slug = text(doc.slug)
    return slug ? [{ kind, path: toPath(slug), lastModified: stamp(doc) }] : []
  })
}

const published: Where = { _status: { equals: "published" } }
const hasSlug: Where = { slug: { exists: true } }

export async function listSitemapEntries(
  ctx: QueryContext
): Promise<SitemapEntry[]> {
  const base = { ...ctx, draft: false }
  const [pages, properties, locations, lists, guides, specials] =
    await Promise.all([
      findAll<PathDoc>(base, "pages", published, { path: true }),
      findAll<SlugDoc>(
        base,
        "properties",
        { and: [{ status: { equals: "active" } }, hasSlug] },
        { slug: true }
      ),
      findAll<LocationDoc & Stamped>(
        base,
        "locations",
        {
          and: [
            { status: { equals: "active" } },
            { visible: { equals: true } },
          ],
        },
        { slug: true, parent: true, name: true, displayName: true, level: true }
      ),
      findAll<SlugDoc>(
        base,
        "curated-lists",
        { and: [published, hasSlug] },
        { slug: true }
      ),
      findAll<SlugDoc>(
        base,
        "guides",
        { and: [published, hasSlug] },
        { slug: true }
      ),
      findAll<SlugDoc>(
        base,
        "specials",
        {
          and: [
            { showOnSite: { equals: true } },
            { status: { equals: "active" } },
            hasSlug,
            {
              or: [
                { validTo: { exists: false } },
                { validTo: { greater_than_equal: new Date().toISOString() } },
              ],
            },
          ],
        },
        { slug: true }
      ),
    ])

  const tree = new LocationTree(locations)
  return [
    ...pages.flatMap((doc): SitemapEntry[] => {
      const path = text(doc.path)
      return path?.startsWith("/")
        ? [{ kind: "page", path, lastModified: stamp(doc) }]
        : []
    }),
    ...bySlug(properties, "property", propertyPath),
    // Only Locations reachable through visible ancestors have a URL.
    ...locations.flatMap((doc): SitemapEntry[] => {
      const ref = tree.ref(String(doc.id))
      return ref
        ? [
            {
              kind: "location",
              path: `/areas/${ref.path.join("/")}`,
              lastModified: stamp(doc),
            },
          ]
        : []
    }),
    ...bySlug(lists, "curatedList", (slug) => `/lists/${slug}`),
    ...bySlug(guides, "guide", (slug) => `/guides/${slug}`),
    ...bySlug(specials, "special", (slug) => `/specials/${slug}`),
  ]
}
