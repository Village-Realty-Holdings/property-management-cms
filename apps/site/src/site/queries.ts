import config from "@payload-config"
import { getPayload } from "payload"
import { cache } from "react"

import type { Page, SiteSetting } from "../payload-types"

/**
 * What the public Site reads, through the Local API as a visitor: access
 * rules apply (`overrideAccess: false`, no user), so only Published content
 * comes back (apps/site ADR-0001). Cached per request.
 */

const asVisitor = { overrideAccess: false, user: null } as const

/** The Published Page at `path` ("/" for Home), or null. */
export const getPublishedPage = cache(
  async (path: string): Promise<Page | null> => {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: "pages",
      where: { path: { equals: path } },
      limit: 1,
      depth: 1,
      draft: false,
      ...asVisitor,
    })
    return docs[0] ?? null
  }
)

/** Site Settings, or null before anyone has saved them. */
export const getSiteSettings = cache(async (): Promise<SiteSetting | null> => {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({
    slug: "site-settings",
    depth: 1,
    ...asVisitor,
  })
  return settings?.name ? settings : null
})

/** The Page path for the catch-all route's segments: [] is "/". */
export function pathFromSegments(segments: readonly string[] | undefined) {
  return `/${(segments ?? []).map(decodeURIComponent).join("/")}`
}
