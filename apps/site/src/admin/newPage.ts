import type { Payload } from "payload"

import { checkPagePath, defaultPagePath } from "../collections/Pages/path"
import {
  freePath,
  NEW_PAGE_PATH,
  NEW_PAGE_TITLE,
} from "./editor/modes/pageDocument"
import type { Access } from "./settingsSave"

/**
 * What the New Page dialog asks for, and what the New Page route makes of
 * it. Through the Local API with the caller's access (apps/site ADR-0002),
 * and apart from the Server Actions so it runs in tests without Next.
 */

/** The longest title the route accepts from the address. */
const TITLE_MAX = 200

/** What the dialog sends and the route reads: `?title=…&path=…&template=…`. */
export type NewPageParams = {
  title?: string | string[]
  path?: string | string[]
  template?: string | string[]
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

/** Whether a Page already uses `path`. The save is still the guarantee. */
export async function pagePathTakenAs(
  payload: Payload,
  access: Access,
  path: string
): Promise<boolean> {
  if (typeof path !== "string" || checkPagePath(path) !== true) return false
  const { totalDocs } = await payload.count({
    collection: "pages",
    where: { path: { equals: path } },
    ...access,
  })
  return totalDocs > 0
}

/**
 * The title and path a New Page opens with. The address can say anything, so
 * each is checked again: a title that is empty or too long falls back to
 * "Untitled Page", and a path that is badly formed or already used falls back
 * to the path of the title (or "/untitled-page"), numbered until it is free.
 */
export async function newPageStartAs(
  payload: Payload,
  access: Access,
  params: NewPageParams
): Promise<{ title: string; path: string }> {
  const wanted = first(params.title)?.trim() ?? ""
  const title =
    wanted !== "" && wanted.length <= TITLE_MAX ? wanted : NEW_PAGE_TITLE
  const requested = first(params.path)

  const { docs } = await payload.find({
    collection: "pages",
    pagination: false,
    depth: 0,
    select: { path: true },
    ...access,
  })
  const taken = docs.map((doc) => doc.path)

  if (
    typeof requested === "string" &&
    checkPagePath(requested) === true &&
    !taken.includes(requested)
  ) {
    return { title, path: requested }
  }
  const fromTitle = title === NEW_PAGE_TITLE ? null : defaultPagePath(title)
  const base =
    fromTitle !== null && checkPagePath(fromTitle) === true
      ? fromTitle
      : NEW_PAGE_PATH
  return { title, path: freePath(base, taken) }
}
