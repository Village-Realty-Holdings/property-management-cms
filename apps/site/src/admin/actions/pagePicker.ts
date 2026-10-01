"use server"

import { loadPageRows } from "../dashboard/queries"
import type { PickerPage } from "../editor/PagePicker"
import { requireStaff } from "../session"

/** The most Pages one search returns: the picker is for finding, not listing. */
const LIMIT = 25

/**
 * The Ctrl-K Page picker's search: Pages whose title or path contains `query`
 * (every Page, newest change first, when it is empty), as the Staff User.
 * A Page shows its newest version's title, so a Draft's new title is found.
 */
export async function searchPages(query: string): Promise<PickerPage[]> {
  const { payload, as } = await requireStaff()
  const q = typeof query === "string" ? query.trim().slice(0, 200) : ""
  const rows = await loadPageRows(payload, as, { q })
  return rows
    .slice(0, LIMIT)
    .map(({ id, title, path, status }) => ({ id, title, path, status }))
}
