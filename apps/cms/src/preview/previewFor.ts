import type { Payload, TypedUser } from "payload"

import {
  contentAdapter,
  type ContentAdapter,
  type CuratedListPage,
  type GuideDoc,
  type PageDoc,
} from "@workspace/content/queries"

import { localContentClient } from "./localClient"

type ID = number | string

/** Collections with Drafts and a page of their own on the Site (ADR-0002). */
export const previewCollections = ["pages", "guides", "curated-lists"] as const

export type PreviewCollection = (typeof previewCollections)[number]

function isPreviewCollection(value: unknown): value is PreviewCollection {
  return (previewCollections as readonly unknown[]).includes(value)
}

/** What the Preview route renders: the document's view and its content. */
export type Preview = {
  kind: "preview"
  /** The Site's slug. */
  site: string
  /** Reads more of the Site as it would show with this Draft (Blocks, chrome). */
  content: ContentAdapter
} & (
  | { collection: "pages"; page: PageDoc }
  | { collection: "guides"; guide: GuideDoc }
  | { collection: "curated-lists"; list: CuratedListPage }
)

export type NotFound = { kind: "notFound" }
export type LoginRequired = { kind: "loginRequired" }

export type PreviewParams = { site: string; collection: string; id: string }

const notFound: NotFound = { kind: "notFound" }

function idOf(ref: unknown): ID | undefined {
  const id = ref && typeof ref === "object" ? (ref as { id?: unknown }).id : ref
  return typeof id === "number" || typeof id === "string" ? id : undefined
}

const segmentsOf = (path: string) => path.split("/").filter(Boolean)

/**
 * A Draft of a Page, Guide or Curated List as its Site will show it, for the
 * Staff User making the request (ADR-0018).
 *
 * - Anyone but a Staff User (anonymous, a SiteReader): `LoginRequired`.
 * - A document the Staff User can't read, or on another Site than `site`:
 *   `NotFound`, as if it didn't exist.
 * - Otherwise the latest version, Draft or published, read through the Local
 *   API as that Staff User and mapped exactly as the Site maps it, Variables
 *   included.
 */
export async function previewFor(
  req: { payload: Payload; headers: Headers },
  { site, collection, id }: PreviewParams
): Promise<Preview | NotFound | LoginRequired> {
  const { payload } = req
  const { user } = await payload.auth({ headers: req.headers })
  if (!user || user.collection !== "users") return { kind: "loginRequired" }
  if (!isPreviewCollection(collection) || !id) return notFound

  const doc = (await payload.findByID({
    collection,
    id,
    depth: 0,
    draft: true,
    overrideAccess: false,
    user,
    disableErrors: true,
  })) as { site?: unknown; path?: unknown; slug?: unknown } | null
  const siteId = idOf(doc?.site)
  if (!doc || siteId === undefined) return notFound

  const siteDoc = await payload.findByID({
    collection: "sites",
    id: siteId,
    depth: 0,
    select: { slug: true },
    overrideAccess: false,
    user,
    disableErrors: true,
  })
  if (!siteDoc || siteDoc.slug !== site) return notFound

  const content = contentAdapter({
    client: localContentClient({
      payload,
      user: user as TypedUser,
      siteId,
      baseURL: "",
    }),
    site,
    draft: true,
  })
  const base = { kind: "preview" as const, site, content }

  if (collection === "pages") {
    const page =
      typeof doc.path === "string"
        ? await content.getPage(segmentsOf(doc.path))
        : null
    return page ? { ...base, collection, page } : notFound
  }
  if (typeof doc.slug !== "string" || !doc.slug) return notFound
  if (collection === "guides") {
    const guide = await content.getGuide(doc.slug)
    return guide ? { ...base, collection, guide } : notFound
  }
  const list = await content.getCuratedList(doc.slug)
  return list ? { ...base, collection, list } : notFound
}
