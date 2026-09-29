import type { FilterOptions, FilterOptionsProps } from "payload"

/** The Site id of a document's `site` field: an id or a populated Site. */
export function siteIdOf(data: unknown): number | string | undefined {
  const site = (data as { site?: unknown } | null | undefined)?.site
  const id =
    site && typeof site === "object" && "id" in site
      ? (site as { id: unknown }).id
      : site
  return typeof id === "number" || (typeof id === "string" && id !== "")
    ? id
    : undefined
}

/**
 * `filterOptions` for relationship and upload fields that point at
 * Site-scoped collections: only documents on the same Site as the document
 * being edited. Payload also runs `filterOptions` when validating a save, so
 * a reference to another Site's document is rejected, not just hidden from
 * the picker. The multi-tenant plugin does not filter upload fields
 * (ADR-0010), so every upload to `media` needs it.
 *
 * Fails closed: while the document has no Site (it is required, so only
 * mid-edit or on a write that omits it) nothing matches.
 *
 * The one exception is the list view's filter builder, which calls
 * `filterOptions` with no document at all (`data` is `{}`). It only narrows
 * the options offered for filtering the list, which read access already
 * limits, and no save is ever validated with empty data and a reference set.
 */
export const sameSite: FilterOptions = ({ data }: FilterOptionsProps) => {
  if (isListFilter(data)) return true
  const id = siteIdOf(data)
  if (id === undefined) return false
  return { site: { equals: id } }
}

function isListFilter(data: unknown): boolean {
  return (
    data !== null &&
    typeof data === "object" &&
    Object.keys(data as object).length === 0
  )
}
