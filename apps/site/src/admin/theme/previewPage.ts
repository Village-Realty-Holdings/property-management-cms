import type { Payload } from "payload"

import type { Page } from "../../payload-types"
import type { PageBlock } from "../../site/blocks/types"
import { readLayoutFor } from "../../site/read"
import type { FooterBlock, HeaderBlock } from "../../site/regions/types"
import type { UserAccess } from "./themeScreen"

/**
 * A Page as Theme mode's canvas shows it: its saved Blocks between the Header
 * and Footer of the Layout it resolves to. The Theme is previewed on real
 * content, so nothing here is edited; it is read in the Site's own shape (the
 * one the canvas renders), not the editor's form shape.
 */
export type PreviewPage = {
  /** The Site route the canvas stands on. */
  path: string
  page: PageBlock[]
  header: HeaderBlock[]
  footer: FooterBlock[]
}

/** The Home path: the canvas starts here. */
export const HOME_PATH = "/"

/** What a Page shows with `doc` (or nothing, when it does not exist) in its Layout. */
async function previewOf(
  payload: Payload,
  path: string,
  doc: Page | null
): Promise<PreviewPage> {
  const layout = await readLayoutFor(payload, doc)
  return {
    path,
    page: (doc?.blocks ?? []) as unknown as PageBlock[],
    header: (layout?.header ?? []) as unknown as HeaderBlock[],
    footer: (layout?.footer ?? []) as unknown as FooterBlock[],
  }
}

/**
 * Home for the canvas to start on. A Site with no Home Page still has a
 * canvas: no Blocks, in the default Layout.
 */
export async function loadHomePreview(
  payload: Payload,
  access: UserAccess
): Promise<PreviewPage> {
  const { docs } = await payload.find({
    collection: "pages",
    where: { path: { equals: HOME_PATH } },
    limit: 1,
    depth: 1,
    draft: false,
    ...access,
  })
  return previewOf(payload, HOME_PATH, docs[0] ?? null)
}

/** The Page `id`, or null when there is no such Page. */
export async function loadPagePreview(
  payload: Payload,
  access: UserAccess,
  id: number
): Promise<PreviewPage | null> {
  if (!Number.isInteger(id) || id <= 0) return null
  const doc = await payload
    .findByID({ collection: "pages", id, depth: 1, draft: false, ...access })
    .catch(() => null)
  return doc ? previewOf(payload, doc.path, doc) : null
}

/** How many Pages a Theme save reaches: every Published Page. */
export async function countPublishedPages(
  payload: Payload,
  access: UserAccess
): Promise<number> {
  const { totalDocs } = await payload.count({
    collection: "pages",
    where: { _status: { equals: "published" } },
    ...access,
  })
  return totalDocs
}
