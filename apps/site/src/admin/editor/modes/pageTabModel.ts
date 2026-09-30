import { defaultPagePath } from "../../../collections/Pages/path"
import {
  layoutLabel,
  resolveLayout,
  type LayoutChoice as RouteChoice,
} from "../../../layouts/resolve"
import type { Layout } from "../../../payload-types"
import type { BlockValues } from "../../pageForm"
import type { LayoutChoice } from "../state"

/**
 * What the Page tab works out on the client, as plain data: which Layout a
 * Page resolves to for its path and choice (the same resolution the Site
 * uses), when a New Page's path follows its title, and the SEO counters.
 */

/** A Layout the Page tab can pick, with the Blocks the canvas draws around the Page. */
export type LayoutOption = {
  id: number
  name: string
  isDefault: boolean
  /** The path prefixes the Layout covers. */
  paths: string[]
  header: BlockValues[]
  footer: BlockValues[]
}

/** The Layout a Page resolves to, for its locked header and footer. */
export type ResolvedLayout = {
  id: number
  name: string
  /** How the Page came to use it: "Listings, via /stays", "Main (default)". */
  label: string
  header: BlockValues[]
  footer: BlockValues[]
}

/** A stored Layout as an option. */
export function layoutOptionOf(layout: Layout): LayoutOption {
  return {
    id: layout.id,
    name: layout.name,
    isDefault: Boolean(layout.isDefault),
    paths: (layout.paths ?? []).map((row) => row.path),
    header: (layout.header ?? []) as unknown as BlockValues[],
    footer: (layout.footer ?? []) as unknown as BlockValues[],
  }
}

const routeChoice = (choice: LayoutChoice): RouteChoice =>
  choice.mode === "none"
    ? { mode: "none" }
    : choice.mode === "layout"
      ? { mode: "specific", layoutId: choice.layoutId }
      : { mode: "route" }

/** The Layout `path` renders with under `choice`; null for none. */
export function resolvePageLayout(
  layouts: readonly LayoutOption[],
  path: string,
  choice: LayoutChoice
): ResolvedLayout | null {
  const resolution = resolveLayout({
    path,
    choice: routeChoice(choice),
    layouts,
  })
  if (!resolution.layout) return null
  const { id, name, header, footer } = resolution.layout
  return { id, name, label: layoutLabel(resolution), header, footer }
}

/**
 * The path a New Page moves to when its title changes from `from` to `to`:
 * only while the path is still the one the old title gave (or that with a
 * number after it, "/untitled-page-2"), so a path typed by hand is kept. A
 * saved Page's address never follows its title: the Site links to it. Null
 * when the path stays as it is.
 */
export function nextPathForTitle(input: {
  saved: boolean
  path: string
  from: string
  to: string
}): string | null {
  if (input.saved) return null
  const old = defaultPagePath(input.from)
  if (old === null) return null
  const followed =
    input.path === old ||
    (old !== "/" && new RegExp(`^${old}-\\d+$`).test(input.path))
  if (!followed) return null
  const next = defaultPagePath(input.to)
  return next !== null && next !== input.path ? next : null
}

/** The character counter under an SEO field. */
export function seoCount(text: string, max: number) {
  const count = text.trim().length
  return { count, max, over: count > max }
}

/**
 * The name the "Make a new Layout" prompt starts with: "Main (copy)", then
 * "Main (copy 2)" ... the first one no Layout has (any letter case). The server
 * is the judge of a name; this only saves typing.
 */
export function suggestLayoutName(
  name: string,
  layouts: readonly Pick<LayoutOption, "name">[]
): string {
  const taken = new Set(
    layouts.map((layout) => layout.name.trim().toLowerCase())
  )
  const first = `${name} (copy)`
  if (!taken.has(first.toLowerCase())) return first
  for (let n = 2; ; n++) {
    const candidate = `${name} (copy ${n})`
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
}
