/** Where a Page is in its Draft / Published lifecycle, as the Admin shows it. */
export type PageStatus = "draft" | "published" | "changes"

type Status = "draft" | "published" | null | undefined

/**
 * A Page's status from two facts: the status of the document visitors are
 * served (the published copy; `draft` when it was never published) and the
 * status of its newest version (the Draft a User last saved).
 */
export function derivePageStatus({
  published,
  latest,
}: {
  published: Status
  latest: Status
}): PageStatus {
  if (published !== "published") return "draft"
  return latest === "published" ? "published" : "changes"
}

const LABELS: Record<PageStatus, string> = {
  draft: "Draft",
  published: "Published",
  changes: "Changes not published",
}

export function pageStatusLabel(status: PageStatus): string {
  return LABELS[status]
}
