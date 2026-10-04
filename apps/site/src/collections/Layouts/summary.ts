/** The change summary of a Layout version, as history lists it. */

export type LayoutState = {
  name: string
  header: readonly unknown[]
  footer: readonly unknown[]
  paths: readonly string[]
  isDefault: boolean
}

export const CREATED_SUMMARY = "Created the Layout"
/** A save that changes nothing (only a write around the Admin reaches it). */
export const SAVED_AGAIN_SUMMARY = "Saved again"

/** Block rows carry generated ids; two saves of the same Blocks differ only there. */
function withoutIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutIds)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "id")
        .map(([key, entry]) => [key, withoutIds(entry)])
    )
  }
  return value
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(withoutIds(a)) === JSON.stringify(withoutIds(b))

/**
 * The summary of a save: the User's note when there is one, otherwise what
 * changed from the previous save (`from`, null on the first) to what is saved.
 */
export function layoutSummary(
  from: LayoutState | null,
  to: LayoutState,
  options: { note?: string | null } = {}
): string {
  const note = options.note?.trim()
  if (note) return note
  if (!from) return CREATED_SUMMARY

  const changes: string[] = []
  if (from.name !== to.name) changes.push("Renamed")
  if (!same(from.header, to.header)) changes.push("Header changed")
  if (!same(from.footer, to.footer)) changes.push("Footer changed")
  if (!same(from.paths, to.paths)) changes.push("Paths changed")
  if (from.isDefault !== to.isDefault) {
    changes.push(to.isDefault ? "Made the default" : "No longer the default")
  }
  return changes.length > 0 ? changes.join(", ") : SAVED_AGAIN_SUMMARY
}
