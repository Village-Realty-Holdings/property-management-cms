import type { Payload } from "payload"

import type { Access } from "../settingsSave"
import { sitePath } from "./collect"
import { loadLinks, type LinkUse } from "./screen"

/**
 * What still links to `path`: every place on the Pages, Page Templates and
 * Layouts whose link leads to it, in any spelling the Links tool treats as the
 * same path ("/stays", "/stays/", "/stays#top", the Site's own full URL). Used
 * when a Published Page's path is about to change. A menu link that points at
 * a Page is not a URL and follows its Page by itself, so it is not listed.
 */
export async function linksToPathAs(
  payload: Payload,
  access: Access,
  path: string,
  { siteUrl }: { siteUrl?: string | null } = {}
): Promise<LinkUse[]> {
  const target = sitePath(path.trim(), siteUrl)
  if (target === null) return []
  const rows = await loadLinks(payload, access, { siteUrl })
  return rows
    .filter(
      (row) =>
        row.kind === "internal" &&
        row.url !== null &&
        sitePath(row.url, siteUrl) === target
    )
    .flatMap((row) => row.uses)
    .sort(
      (a, b) =>
        a.kind.localeCompare(b.kind) ||
        a.title.localeCompare(b.title) ||
        a.place.localeCompare(b.place)
    )
}
