import "server-only"

import type { Payload } from "payload"

import { readLayouts } from "../../../site/read"
import type { MediaOption } from "../../components/MediaSelect"
import { mediaOptions } from "../../media"
import type { StaffContext } from "../../session"
import type { PageOption } from "../fields/context"
import { layoutOptionOf, type LayoutOption } from "./pageTabModel"

/**
 * What Page mode needs around the Page, read on the server: every Layout, for
 * the Page tab to pick from and to resolve the Page's own by its path and
 * choice (the same way the Site does), and the Media and Pages the Block
 * tab's pickers offer.
 */

/** Every Layout, with its Header and Footer, oldest first. */
export async function loadLayoutOptions(
  payload: Payload
): Promise<LayoutOption[]> {
  return (await readLayouts(payload)).map(layoutOptionOf)
}

/** Every Page but the Page Templates (they are never live), for the Block tab's link fields. */
export async function pageOptions({
  payload,
  as,
}: StaffContext): Promise<PageOption[]> {
  const { docs } = await payload.find({
    collection: "pages",
    where: { isTemplate: { not_equals: true } },
    draft: true,
    pagination: false,
    sort: "title",
    depth: 0,
    select: { title: true, path: true },
    ...as,
  })
  return docs.map(({ id, title, path }) => ({ id, title, path }))
}

export type PageModeContext = {
  media: MediaOption[]
  pages: PageOption[]
}

/** The pickers' options for the Staff User. */
export async function loadPickers(
  staff: StaffContext
): Promise<PageModeContext> {
  const [media, pages] = await Promise.all([
    mediaOptions(staff),
    pageOptions(staff),
  ])
  return { media, pages }
}
