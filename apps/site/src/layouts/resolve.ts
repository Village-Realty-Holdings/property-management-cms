/**
 * Which Layout a Page renders with (spec Phase 3, "Resolving a Page's Layout").
 * Pure: no Payload, no I/O. The Site, the Visual Editor and the Pages list all
 * call it, so they agree.
 *
 * 1. A Page that picks a specific Layout uses it.
 * 2. A Page that picks "No Layout" renders none.
 * 3. Otherwise the Layout with the longest matching path prefix. `/stays`
 *    covers `/stays` and everything under it, not `/stayshome`.
 * 4. Otherwise the default Layout.
 */

export type LayoutCandidate = {
  id: string | number
  name: string
  paths: readonly string[]
  isDefault: boolean
}

export type LayoutChoice =
  | { mode: "route" }
  | { mode: "none" }
  | { mode: "specific"; layoutId?: string | number | null }

export type LayoutResolution<L extends LayoutCandidate = LayoutCandidate> =
  | { layout: L; reason: "specific" }
  | { layout: null; reason: "none" }
  | { layout: L; reason: "path"; via: string }
  | { layout: L | null; reason: "default" }

/** `/stays/` and `stays` become `/stays`; empty becomes `/`. */
export function normalizePath(path: string): string {
  const segments = path.trim().split("/").filter(Boolean)
  return `/${segments.join("/")}`
}

function covers(prefix: string, path: string): boolean {
  return prefix === "/" || path === prefix || path.startsWith(`${prefix}/`)
}

export function resolveLayout<L extends LayoutCandidate>(input: {
  path: string
  choice: LayoutChoice
  layouts: readonly L[]
}): LayoutResolution<L> {
  const { choice, layouts } = input

  if (choice.mode === "none") return { layout: null, reason: "none" }

  if (choice.mode === "specific" && choice.layoutId != null) {
    const picked = layouts.find(
      (layout) => String(layout.id) === String(choice.layoutId)
    )
    // A deleted Layout falls back to the route rather than to a blank Page.
    if (picked) return { layout: picked, reason: "specific" }
  }

  const path = normalizePath(input.path)
  let best: { layout: L; via: string } | undefined
  for (const layout of layouts) {
    for (const raw of layout.paths) {
      if (!raw.trim()) continue
      const prefix = normalizePath(raw)
      if (!covers(prefix, path)) continue
      // Strictly longer wins, so on a tie the first Layout listed keeps it.
      if (!best || prefix.length > best.via.length) {
        best = { layout, via: prefix }
      }
    }
  }
  if (best) return { layout: best.layout, reason: "path", via: best.via }

  return {
    layout: layouts.find((layout) => layout.isDefault) ?? null,
    reason: "default",
  }
}

/** The Pages list's Layout column. */
export function layoutLabel(resolution: LayoutResolution): string {
  const { layout } = resolution
  if (!layout) return "No Layout"
  switch (resolution.reason) {
    case "specific":
      return layout.name
    case "path":
      return `${layout.name}, via ${resolution.via}`
    default:
      return `${layout.name} (default)`
  }
}
