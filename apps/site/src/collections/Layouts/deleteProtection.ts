import {
  APIError,
  type CollectionBeforeDeleteHook,
  type Payload,
  type PayloadRequest,
  type TypedUser,
  type Where,
} from "payload"

import type { Dependent } from "../../admin/kit/dependents"

/**
 * Deleting Layouts (apps/site ADR-0006). The default Layout can't be deleted.
 * Neither can a Layout that Pages pick explicitly: the error lists those
 * Pages. A Layout that is only a path default deletes, and its paths drop.
 */

type PickingPage = { id: number; title: string; path: string }

type Access =
  | { req: Pick<PayloadRequest, "user"> & Partial<PayloadRequest> }
  | { user: TypedUser }

/**
 * The Pages whose Layout choice is "a specific Layout" and is this one, in
 * either version: the latest Draft or the Published copy. Either one picking
 * it is enough, because publishing the Draft or viewing the Published Page
 * would both lose it. Listed by their latest title, once each.
 */
async function pagesPicking(
  payload: Payload,
  layoutId: number | string,
  access: Access
): Promise<PickingPage[]> {
  const where: Where = {
    and: [
      { "layout.mode": { equals: "specific" } },
      { "layout.layout": { equals: layoutId } },
    ],
  }
  const [drafts, published] = await Promise.all(
    [true, false].map((draft) =>
      payload.find({
        collection: "pages",
        where,
        draft,
        depth: 0,
        pagination: false,
        sort: "id",
        select: { title: true, path: true },
        overrideAccess: false,
        ...access,
      })
    )
  )
  const found = new Map<number, PickingPage>()
  // The Published copy first, so the latest Draft's title wins where both exist.
  for (const page of [...published!.docs, ...drafts!.docs]) {
    found.set(page.id, { id: page.id, title: page.title, path: page.path })
  }
  return [...found.values()].sort((a, b) => a.id - b.id)
}

/**
 * The Pages that would lose their Layout if this one were deleted, for the
 * confirm dialog. Empty when nothing picks it.
 */
export async function layoutDependents(
  payload: Payload,
  options: { id: number; user: TypedUser }
): Promise<Dependent[]> {
  const pages = await pagesPicking(payload, options.id, { user: options.user })
  return pages.map((page) => ({
    kind: "Page",
    name: page.title,
    href: `/admin/pages/${page.id}`,
  }))
}

/** 409: the request is fine, but the Layout's state in use forbids it. */
const CONFLICT = 409

export const refuseDeleteWhenInUse: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  const layout = await req.payload.findByID({
    collection: "layouts",
    id,
    depth: 0,
    req,
  })
  if (layout.isDefault) {
    throw new APIError(
      `"${layout.name}" is the default Layout, so it can't be deleted. Make another Layout the default first.`,
      CONFLICT,
      undefined,
      true
    )
  }

  const pages = await pagesPicking(req.payload, id, { req })
  if (pages.length > 0) {
    const list = pages.map((page) => `${page.title} (${page.path})`).join(", ")
    const noun = pages.length === 1 ? "Page picks" : "Pages pick"
    throw new APIError(
      `"${layout.name}" can't be deleted: ${pages.length} ${noun} it. Give them another Layout first: ${list}.`,
      CONFLICT,
      undefined,
      true
    )
  }
}
