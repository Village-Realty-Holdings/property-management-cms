import "server-only"

import type { Payload } from "payload"

import type { Page } from "../payload-types"
import type { Access } from "./settingsSave"
import { requireStaff } from "./session"

/**
 * SEO health: Published Pages that have no SEO title or no SEO description
 * of their own. The SEO screen lists them; the Dashboard's "SEO health"
 * count is this list's length.
 */

export type SeoAttention = {
  id: number
  title: string
  path: string
  missing: ("title" | "description")[]
}

const blank = (value: string | null | undefined) => !value?.trim()

/** Which of a Page's own SEO title and description are empty. */
export function missingSeo(
  seo: Pick<NonNullable<Page["seo"]>, "title" | "description"> | undefined
): SeoAttention["missing"] {
  const missing: SeoAttention["missing"] = []
  if (blank(seo?.title)) missing.push("title")
  if (blank(seo?.description)) missing.push("description")
  return missing
}

/**
 * Published Pages missing SEO text, by Page title. Reads the published
 * version (`draft: false`), so unpublished edits and Draft-only Pages don't
 * count: they aren't on the Site.
 */
export async function findPagesNeedingSeoAttention(
  payload: Payload,
  access: Access
): Promise<SeoAttention[]> {
  const { docs } = await payload.find({
    collection: "pages",
    where: { _status: { equals: "published" } },
    draft: false,
    pagination: false,
    depth: 0,
    sort: "title",
    select: { title: true, path: true, seo: true },
    ...access,
  })
  return docs.flatMap((page) => {
    const missing = missingSeo(page.seo)
    return missing.length > 0
      ? [{ id: page.id, title: page.title, path: page.path, missing }]
      : []
  })
}

/**
 * Published Pages needing an SEO title or description, read as the signed-in
 * Staff User. Shared by the SEO screen and the Dashboard's SEO health count.
 */
export async function getPagesNeedingSeoAttention(): Promise<SeoAttention[]> {
  const { payload, as } = await requireStaff()
  return findPagesNeedingSeoAttention(payload, as)
}
