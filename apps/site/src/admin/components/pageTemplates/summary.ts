/**
 * What the Page Template lists share. A plain module: the Server Component
 * list and the client New Page button both use it.
 */

export const NEW_PAGE_HREF = "/admin/pages/new"

/**
 * Where a New Page opens, with what the New Page dialog asked for. The route
 * checks each again, so these are only a starting point.
 */
export function newPageHref(input: {
  title: string
  path: string
  /** A Page Template's id; none for a blank Page. */
  templateId?: number | null
}): string {
  const params = new URLSearchParams({ title: input.title, path: input.path })
  if (input.templateId != null) params.set("template", String(input.templateId))
  return `${NEW_PAGE_HREF}?${params}`
}

/** "3 Blocks: Hero, Rich text, Call to action". */
export function blocksSummary(blocks: readonly string[]): string {
  if (blocks.length === 0) return "No Blocks"
  const count = `${blocks.length} ${blocks.length === 1 ? "Block" : "Blocks"}`
  return `${count}: ${blocks.join(", ")}`
}
