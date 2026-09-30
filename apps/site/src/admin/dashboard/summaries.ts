import type { PageRow, RecentItem } from "./rows"

/** How many items Continue editing offers. */
export const CONTINUE_EDITING_LIMIT = 5

/** The most recently edited Pages and Layouts, newest first. */
export function continueEditing(
  items: readonly RecentItem[],
  limit = CONTINUE_EDITING_LIMIT
): RecentItem[] {
  return [...items]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit)
}

/** Pages with changes nobody has published: a Draft, or a newer Draft of a Published Page. */
export function waitingToPublish(rows: readonly PageRow[]): PageRow[] {
  return rows.filter((row) => row.status !== "published")
}
