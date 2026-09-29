import type { TextField } from "payload"

import { propertyLabel } from "../Properties/adminTitle"

type ID = number | string
type Ref = ID | { id: ID } | null | undefined

const idOf = (ref: Ref): ID | undefined =>
  ref && typeof ref === "object" ? ref.id : (ref ?? undefined)

const trimmed = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

type ReviewParts = {
  rating?: number | null
  guestName?: string | null
  /** The Property's name (see propertyLabel). */
  property?: string | null
  title?: string | null
  feedId?: string | null
}

/**
 * The Review's name in the admin, e.g. "★4 — Jane D. — Aspen Hideaway".
 * Missing parts are left out; with none, the Review's title or Feed ID.
 */
export function reviewLabel(parts: ReviewParts): string {
  const label = [
    typeof parts.rating === "number" ? `★${parts.rating}` : "",
    trimmed(parts.guestName),
    trimmed(parts.property),
  ]
    .filter(Boolean)
    .join(" — ")
  return label || trimmed(parts.title) || trimmed(parts.feedId)
}

/**
 * `adminTitle`: the Review's name in lists (`useAsTitle`). Set on every save,
 * including the Sync's, from the rating, guest name and the Property's name
 * at that time (a later Property rename shows after the Review's next save).
 * Documents saved before it existed fall back, on read, to the name without
 * the Property. Not shown in the edit view.
 */
export const reviewAdminTitleField: TextField = {
  name: "adminTitle",
  label: "Review",
  type: "text",
  admin: {
    readOnly: true,
    condition: () => false,
    description: "Rating, guest and Property. Set automatically.",
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const doc = { ...originalDoc, ...data }
        const propertyId = idOf(doc.property as Ref)
        const property =
          propertyId === undefined
            ? null
            : await req.payload.findByID({
                collection: "properties",
                id: propertyId,
                select: { headline: true, feedName: true },
                depth: 0,
                overrideAccess: true,
                disableErrors: true,
                req,
              })
        return (
          reviewLabel({ ...doc, property: propertyLabel(property) }) || null
        )
      },
    ],
    afterRead: [
      ({ value, siblingData }) =>
        value || reviewLabel({ ...siblingData, property: null }),
    ],
  },
}
