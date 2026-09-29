import type { CollectionBeforeChangeHook } from "payload"

type ID = number | string
type Ref = ID | { id: ID } | null | undefined

const idOf = (ref: Ref): ID | undefined =>
  ref && typeof ref === "object" ? ref.id : (ref ?? undefined)

/**
 * `beforeChange` on Reviews: applies the Site's Moderation rule
 * (`site.moderation.autoShowMinRating`) to a new Review. At or above the
 * threshold it is created as shown; otherwise it keeps its Moderation
 * (`pending` by default). An explicit `hidden` is never overridden.
 * Runs for Sync creates too (hooks run under `overrideAccess`).
 */
export const applyModerationRule: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== "create" || !data) return data
  if ((data.moderation ?? "pending") !== "pending") return data
  const rating: unknown = data.rating
  if (typeof rating !== "number") return data
  const siteId = idOf(data.site as Ref)
  if (siteId === undefined) return data

  const site = await req.payload.findByID({
    collection: "sites",
    id: siteId,
    select: { moderation: true },
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    req,
  })
  const min = (site as { moderation?: { autoShowMinRating?: number | null } })
    ?.moderation?.autoShowMinRating
  if (typeof min === "number" && rating >= min) {
    return { ...data, moderation: "shown" }
  }
  return data
}
