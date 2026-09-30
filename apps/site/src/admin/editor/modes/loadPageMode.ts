import "server-only"

import type { Payload } from "payload"

import {
  layoutLabel,
  resolveLayout,
  type LayoutChoice,
} from "../../../layouts/resolve"
import type { Page } from "../../../payload-types"
import { readLayouts } from "../../../site/read"
import type { MediaOption } from "../../components/MediaSelect"
import { mediaOptions } from "../../media"
import type { StaffContext } from "../../session"
import type { PageOption } from "../fields/context"
import type { ResolvedLayout } from "./PageSettings"
import type { BlockValues } from "../../pageForm"

/**
 * What Page mode needs around the Page, read on the server: the Layout the
 * Page resolves to (by its choice, its path, or the default, the same way the
 * Site does), and the Media and Pages the Block tab's pickers offer.
 */

const idOf = (value: number | { id: number } | null | undefined) =>
  typeof value === "object" && value !== null ? value.id : value

function choiceOf(layout: Page["layout"] | undefined): LayoutChoice {
  if (layout?.mode === "none") return { mode: "none" }
  if (layout?.mode === "specific") {
    return { mode: "specific", layoutId: idOf(layout.layout) }
  }
  return { mode: "route" }
}

/** The Layout `page` renders with, for its locked header and footer; null for none. */
export async function resolvePageLayout(
  payload: Payload,
  page: Pick<Page, "path" | "layout">
): Promise<ResolvedLayout | null> {
  const layouts = await readLayouts(payload)
  const resolution = resolveLayout({
    path: page.path,
    choice: choiceOf(page.layout),
    layouts: layouts.map((layout) => ({
      id: layout.id,
      name: layout.name,
      isDefault: Boolean(layout.isDefault),
      paths: (layout.paths ?? []).map((row) => row.path),
      layout,
    })),
  })
  if (!resolution.layout) return null
  const { layout } = resolution.layout
  return {
    id: layout.id,
    name: layout.name,
    label: layoutLabel(resolution),
    header: (layout.header ?? []) as unknown as BlockValues[],
    footer: (layout.footer ?? []) as unknown as BlockValues[],
  }
}

/** Every Page, for the Block tab's link fields. */
export async function pageOptions({
  payload,
  as,
}: StaffContext): Promise<PageOption[]> {
  const { docs } = await payload.find({
    collection: "pages",
    pagination: false,
    sort: "title",
    depth: 0,
    select: { title: true, path: true },
    ...as,
  })
  return docs.map(({ id, title, path }) => ({ id, title, path }))
}

export type PageModeContext = {
  media: MediaOption[]
  pages: PageOption[]
}

/** The pickers' options for the Staff User. */
export async function loadPickers(
  staff: StaffContext
): Promise<PageModeContext> {
  const [media, pages] = await Promise.all([
    mediaOptions(staff),
    pageOptions(staff),
  ])
  return { media, pages }
}
