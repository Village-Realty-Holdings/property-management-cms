import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  PayloadRequest,
} from "payload"

type ID = number | string
type Ref = ID | { id: ID } | null | undefined

const idOf = (ref: Ref): ID | undefined =>
  ref && typeof ref === "object" ? ref.id : (ref ?? undefined)

export type PropertyRating = {
  /** Average of shown, Active Reviews' ratings, 2 decimals; null when none. */
  rating: number | null
  /** Number of shown, Active Reviews. */
  reviewCount: number
}

/**
 * The Rating (CONTEXT.md) from the ratings of a Property's shown, Active
 * Reviews. Reviews without a rating count as Reviews but not in the average.
 */
export function computeRating(
  ratings: readonly (number | null | undefined)[]
): PropertyRating {
  const scores = ratings.filter(
    (r): r is number => typeof r === "number" && Number.isFinite(r)
  )
  const rating =
    scores.length === 0
      ? null
      : Math.round(
          (scores.reduce((sum, r) => sum + r, 0) / scores.length) * 100
        ) / 100
  return { rating, reviewCount: ratings.length }
}

/**
 * Recomputes a Property's `rating` and `reviewCount` from its shown, Active
 * Reviews and writes them to the Property (a Property Fact, so with
 * `overrideAccess`). Runs in `req`'s transaction. The write to Properties
 * skips revalidation (the Review's own change covers it) and cannot loop:
 * Properties have no hooks that write Reviews.
 */
export async function recomputePropertyRating(
  req: PayloadRequest,
  propertyId: ID
): Promise<PropertyRating> {
  const { docs } = await req.payload.find({
    collection: "reviews",
    where: {
      and: [
        { property: { equals: propertyId } },
        { moderation: { equals: "shown" } },
        { status: { equals: "active" } },
      ],
    },
    select: { rating: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const result = computeRating(
    docs.map((doc) => (doc as { rating?: number | null }).rating)
  )

  // Local API calls assign `req.context` on the shared req. Restore it so
  // `skipRevalidation` doesn't leak into the Review's remaining hooks.
  const context = req.context
  try {
    // `where` rather than `id`: a missing Property is not an error here.
    await req.payload.update({
      collection: "properties",
      where: { id: { equals: propertyId } },
      data: result,
      depth: 0,
      overrideAccess: true,
      context: { skipRevalidation: true },
      req,
    })
  } finally {
    req.context = context
  }
  return result
}

/** Fields that change which Reviews count, or their score. */
const RATING_INPUTS = ["property", "moderation", "status", "rating"] as const

/** `afterChange` on Reviews: recompute the Property (and the previous one if it moved). */
export const recomputeRatingAfterChange: CollectionAfterChangeHook = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  const changed =
    operation === "create" ||
    RATING_INPUTS.some(
      (field) =>
        String(idOf(doc?.[field]) ?? "") !==
        String(idOf(previousDoc?.[field]) ?? "")
    )
  if (!changed) return doc

  const current = idOf(doc?.property)
  const previous = idOf(previousDoc?.property)
  if (current !== undefined) await recomputePropertyRating(req, current)
  if (previous !== undefined && String(previous) !== String(current)) {
    await recomputePropertyRating(req, previous)
  }
  return doc
}

/** `afterDelete` on Reviews: recompute the Review's Property. */
export const recomputeRatingAfterDelete: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  const property = idOf(doc?.property)
  if (property !== undefined) await recomputePropertyRating(req, property)
  return doc
}
