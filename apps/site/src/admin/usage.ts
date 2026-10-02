import type { Field, Payload } from "payload"

import { Layouts } from "../collections/Layouts"
import { Pages } from "../collections/Pages"
import { loadMenusLinkingTo } from "../collections/Pages/navigationGuard"
import { Brand as BrandConfig } from "../globals/Brand"
import { SEO as SeoConfig } from "../globals/SEO"
import type { Brand, Layout, Page, Seo } from "../payload-types"
import type { Dependent } from "./kit"
import { mediaUses, type MediaUse } from "./mediaUses"
import type { Access } from "./settingsSave"

/**
 * What uses an item, for the confirmation before deleting it: which places
 * show a Media image, and which Pages and Layouts (by the menu) link to a Page.
 */

const BRAND_HREF = "/admin/settings/brand"
const SEO_HREF = "/admin/settings/seo"

type Version = "draft" | "published"

type PageUse = Pick<Page, "id" | "title" | "path" | "blocks" | "seo"> & {
  /** Which copy of the Page this is, when both are loaded. */
  version?: Version
}
type LayoutUse = Pick<Layout, "id" | "name" | "header" | "footer">

/** One Block (or the document's own fields) of one Page or Layout. */
type Place = {
  kind: "Page" | "Layout"
  documentId: number
  title: string
  /** "Block 3, Amenities", or null for a field of the document itself. */
  block: string | null
  href: string
  /** Where in it: "Amenity 2: Image". */
  wheres: Set<string>
  versions: Set<Version>
}

/**
 * For every Media id in use: the Brand and SEO settings, and every Block (and
 * SEO field) of every Page and Layout that shows it, one entry each. Found by
 * walking the fields in the Payload config, so the images of every Block
 * count, in either copy of a Page (its Draft and its Published copy) and in
 * Layouts.
 */
export function mediaDependents({
  brand,
  seo,
  pages,
  layouts = [],
  layoutFields = Layouts.fields,
}: {
  brand: Pick<Brand, "logo">
  seo: Pick<Seo, "image" | "favicon">
  pages: readonly PageUse[]
  layouts?: readonly LayoutUse[]
  /** The Layout's fields; a test swaps in Blocks to prove any Block counts. */
  layoutFields?: readonly Field[]
}): Map<number, Dependent[]> {
  const result = new Map<number, Dependent[]>()
  const add = (mediaId: number, dependent: Dependent) => {
    result.set(mediaId, [...(result.get(mediaId) ?? []), dependent])
  }

  for (const use of mediaUses(BrandConfig.fields, brand)) {
    add(use.mediaId, {
      kind: "Brand setting",
      name: use.where,
      href: BRAND_HREF,
    })
  }
  for (const use of mediaUses(SeoConfig.fields, seo)) {
    add(use.mediaId, {
      kind: "SEO setting",
      name: use.where,
      href: SEO_HREF,
    })
  }

  // A Page can appear once per version: each Block is named once, with where
  // either version uses the image.
  const places = new Map<number, Map<string, Place>>()
  const versionsLoaded = new Map<string, Set<Version>>()
  const collect = (
    document: Pick<Place, "kind" | "documentId" | "title" | "href">,
    version: Version,
    uses: MediaUse[]
  ) => {
    const doc = `${document.kind}:${document.documentId}`
    versionsLoaded.set(doc, (versionsLoaded.get(doc) ?? new Set()).add(version))
    for (const use of uses) {
      const block = use.block?.label ?? null
      const key = `${doc}|${use.block?.id ?? block ?? ""}`
      const perMedia = places.get(use.mediaId) ?? new Map<string, Place>()
      places.set(use.mediaId, perMedia)
      const place = perMedia.get(key) ?? {
        ...document,
        block,
        wheres: new Set<string>(),
        versions: new Set<Version>(),
      }
      perMedia.set(key, place)
      place.wheres.add(use.where)
      place.versions.add(version)
    }
  }

  const titles = new Map<number, string>()
  for (const page of pages) {
    // The latest Draft comes first, so its title is the one shown.
    if (!titles.has(page.id)) titles.set(page.id, page.title)
    collect(
      {
        kind: "Page",
        documentId: page.id,
        title: titles.get(page.id)!,
        href: `/admin/pages/${page.id}`,
      },
      page.version ?? "draft",
      mediaUses(Pages.fields, page)
    )
  }
  for (const layout of layouts) {
    collect(
      {
        kind: "Layout",
        documentId: layout.id,
        title: layout.name,
        href: `/admin/layouts/${layout.id}`,
      },
      "published",
      mediaUses(layoutFields, layout)
    )
  }

  for (const [mediaId, perMedia] of places) {
    for (const place of perMedia.values()) {
      // Say which copy only when the Page has two and just one uses it.
      const loaded = versionsLoaded.get(`${place.kind}:${place.documentId}`)
      const only =
        (loaded?.size ?? 0) > 1 && place.versions.size === 1
          ? [...place.versions][0]
          : undefined
      const detail = [
        ...place.wheres,
        ...(only ? [`${only === "draft" ? "Draft" : "Published"} only`] : []),
      ].join(", ")
      add(mediaId, {
        kind: place.kind,
        name: place.block
          ? `${place.title}, ${place.block} (${detail})`
          : `${place.title}, ${detail}`,
        href: place.href,
      })
    }
  }
  return result
}

/**
 * Why an image in use can't be deleted, naming every use, as the Fonts
 * collection's delete error does.
 */
export function mediaInUseMessage(
  filename: string,
  dependents: readonly Dependent[]
): string {
  const uses = dependents.map((d) => `${d.kind}: ${d.name}`).join("; ")
  const one = dependents.length === 1
  return `${filename} can't be deleted: ${dependents.length} ${one ? "place uses" : "places use"} it. Remove it from ${one ? "that" : "those"} first. ${uses}.`
}

/** "/stays/", "/stays?room=2#top" and "/stays" are the same Site path. */
function normalisePath(href: string): string | null {
  if (!href.startsWith("/") || href.startsWith("//")) return null
  const path = href.split(/[?#]/)[0]!
  return path.length > 1 ? path.replace(/\/+$/, "") : path
}

type Link = { href?: string | null } | null

/** A Block as far as its links go: what `linksOf` reads of it. */
type LinkingBlock = {
  blockType: string
  cta?: Link
  button?: Link
  link?: Link
  children?: readonly LinkingBlock[] | null
}

/**
 * Where the buttons of `blocks` link to: a Hero's, a Call to action's and a
 * Button's, on the Page and in Containers at any depth.
 */
function linksOf(blocks: readonly LinkingBlock[] | null | undefined): string[] {
  return (blocks ?? []).flatMap((block) => {
    switch (block.blockType) {
      case "hero":
        return block.cta?.href ?? []
      case "callToAction":
        return block.button?.href ?? []
      case "button":
        return block.link?.href ?? []
      case "container":
        return linksOf(block.children)
      default:
        return []
    }
  })
}

/** The other Pages with a button that links to `path`. */
export function pagesLinkingTo(
  path: string,
  ownId: number,
  pages: readonly PageUse[]
): Dependent[] {
  const target = normalisePath(path)
  if (target == null) return []
  const seen = new Set<number>()
  return pages
    .filter((page) => page.id !== ownId)
    .filter((page) =>
      linksOf(page.blocks as LinkingBlock[] | null | undefined).some(
        (href) => normalisePath(href) === target
      )
    )
    .filter((page) => !seen.has(page.id) && seen.add(page.id))
    .map((page) => ({
      kind: "Page",
      name: page.title,
      href: `/admin/pages/${page.id}`,
    }))
}

/**
 * Every Page in both its versions, the latest Draft and the Published copy:
 * deleting hurts whichever one still uses the item.
 */
async function loadAllPageVersions(
  payload: Payload,
  access: Access
): Promise<PageUse[]> {
  const select = {
    title: true,
    path: true,
    blocks: true,
    seo: true,
  } as const
  const [latest, published] = await Promise.all(
    [true, false].map((draft) =>
      payload.find({
        collection: "pages",
        pagination: false,
        depth: 0,
        draft,
        select,
        sort: "id",
        ...access,
      })
    )
  )
  return [
    ...latest!.docs.map((doc): PageUse => ({ ...doc, version: "draft" })),
    ...published!.docs.map(
      (doc): PageUse => ({ ...doc, version: "published" })
    ),
  ]
}

/** Media id -> what uses it, for the Media screen's delete confirmation. */
export async function loadMediaDependents(
  payload: Payload,
  access: Access
): Promise<Map<number, Dependent[]>> {
  const [brand, seo, pages, layouts] = await Promise.all([
    payload.findGlobal({ slug: "brand", depth: 0, ...access }),
    payload.findGlobal({ slug: "seo", depth: 0, ...access }),
    loadAllPageVersions(payload, access),
    payload.find({
      collection: "layouts",
      pagination: false,
      depth: 0,
      sort: "id",
      ...access,
    }),
  ])
  return mediaDependents({ brand, seo, pages, layouts: layouts.docs })
}

/**
 * What links to this Page, for its delete confirmation: the Pages with a
 * button to its path, and the Layouts whose menus link to it (each menu named,
 * as the delete error names them).
 */
export async function loadPageDependents(
  payload: Payload,
  access: Access,
  { id, path }: { id: number; path: string }
): Promise<Dependent[]> {
  const [pages, menus] = await Promise.all([
    loadAllPageVersions(payload, access),
    loadMenusLinkingTo(payload, id, access),
  ])
  return [
    ...pagesLinkingTo(path, id, pages),
    ...menus.map(
      (menu): Dependent => ({
        kind: "Layout",
        name: `${menu.layoutName} (${menu.menu})`,
        href: `/admin/layouts/${menu.layoutId}`,
      })
    ),
  ]
}
