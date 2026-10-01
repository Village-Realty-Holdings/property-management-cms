import type { CollectionAfterChangeHook, TextField } from "payload"

import { refId } from "./ancestors"

type LocationNames = {
  displayName?: string | null
  name?: string | null
}

const trimmed = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

export const levelLabels: Record<string, string> = {
  destination: "Destination",
  area: "Area",
  complex: "Complex",
}

/** The Location's own name: its display name, else its Feed name. */
export function locationName(doc: LocationNames | null | undefined): string {
  return trimmed(doc?.displayName) || trimmed(doc?.name)
}

/**
 * The Location's name in the admin, e.g. "Destin › Long Beach Resort (Complex)":
 * its parent's name, its own name and its Location Level, each left out when
 * missing.
 */
export function locationLabel({
  parent,
  name,
  level,
}: {
  parent?: string | null
  name?: string | null
  level?: string | null
}): string {
  const path = [trimmed(parent), trimmed(name)].filter(Boolean).join(" › ")
  const levelLabel = level ? levelLabels[level] : undefined
  return levelLabel ? `${path} (${levelLabel})` : path
}

/**
 * `adminTitle`: the Location's name in lists and relationship pickers
 * (`useAsTitle`), "Parent › Name (Level)". Set on every save, including the
 * Sync's; `relabelChildren` keeps children current when a parent is renamed.
 * Documents saved before it existed fall back, on read, to the name and
 * Level. Not shown in the edit view.
 */
export const locationAdminTitleField: TextField = {
  name: "adminTitle",
  label: "Location",
  type: "text",
  admin: {
    readOnly: true,
    condition: () => false,
    description: "Parent › Name (Location Level). Set automatically.",
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const doc = { ...originalDoc, ...data }
        const parentId = refId(doc.parent)
        const parent =
          parentId === undefined
            ? null
            : await req.payload.findByID({
                collection: "locations",
                id: parentId,
                select: { name: true, displayName: true },
                depth: 0,
                overrideAccess: true,
                disableErrors: true,
                req,
              })
        return (
          locationLabel({
            parent: locationName(parent),
            name: locationName(doc),
            level: doc.level,
          }) || null
        )
      },
    ],
    afterRead: [
      ({ value, siblingData }) =>
        value ||
        locationLabel({
          name: locationName(siblingData),
          level: siblingData?.level,
        }),
    ],
  },
}

/**
 * `afterChange` on Locations: when a Location's name changes, re-saves its
 * children so their `adminTitle` shows the new parent name. Only the direct
 * children (a label names just the parent), without revalidation: the label
 * is admin-only. Runs in `req`'s transaction.
 */
export const relabelChildren: CollectionAfterChangeHook = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  if (operation !== "update") return doc
  if (locationName(doc) === locationName(previousDoc)) return doc

  // Local API calls assign `req.context` on the shared req. Restore it so
  // `skipRevalidation` doesn't leak into this Location's remaining hooks.
  const context = req.context
  try {
    await req.payload.update({
      collection: "locations",
      where: { parent: { equals: doc.id } },
      data: {},
      depth: 0,
      overrideAccess: true,
      context: { skipRevalidation: true },
      req,
    })
  } finally {
    req.context = context
  }
  return doc
}
