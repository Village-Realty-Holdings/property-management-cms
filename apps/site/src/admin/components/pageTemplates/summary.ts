/**
 * What the Page Template lists share. A plain module: the Server Component
 * list and the client New Page button both use it.
 */

export const NEW_PAGE_HREF = "/admin/pages/new"

/** Where a New Page that starts from the Page Template opens. */
export const newPageFromTemplateHref = (id: number) =>
  `${NEW_PAGE_HREF}?template=${id}`

/** "3 Blocks: Hero, Rich text, Call to action". */
export function blocksSummary(blocks: readonly string[]): string {
  if (blocks.length === 0) return "No Blocks"
  const count = `${blocks.length} ${blocks.length === 1 ? "Block" : "Blocks"}`
  return `${count}: ${blocks.join(", ")}`
}
