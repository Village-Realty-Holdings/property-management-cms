import type { CollectionBeforeValidateHook } from "payload"
import { ValidationError } from "payload"

import { getLocationPath, refId } from "./ancestors"

/**
 * `beforeValidate` on Locations: a Location's parent must be another Location
 * on the same Site, and never the Location itself or one of its descendants
 * (which would make a cycle). Only `parent` writes are checked. Staff can't
 * write `parent` (factsReadOnly), so in practice this guards the Sync's
 * `overrideAccess` writes against a bad Feed tree.
 */
export const validateParent: CollectionBeforeValidateHook = async ({
  collection,
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (!data || !("parent" in data)) return data
  const parentId = refId(data.parent)
  if (parentId === undefined) return data
  // Updates resend the stored parent; only a changed parent needs checking.
  if (String(refId(originalDoc?.parent)) === String(parentId)) return data

  const fail = (message: string): never => {
    throw new ValidationError({
      collection: collection.slug,
      errors: [{ path: "parent", message }],
      req,
    })
  }

  const selfId = operation === "update" ? refId(originalDoc) : undefined
  if (selfId !== undefined && String(selfId) === String(parentId)) {
    fail("A Location can't be its own parent.")
  }

  // The parent and all of its ancestors, root first.
  const parentPath = await getLocationPath(req.payload, parentId, { req })
  const parent = parentPath.at(-1)
  if (!parent || String(parent.id) !== String(parentId)) {
    return fail("The parent Location doesn't exist.")
  }

  // A missing `site` is rejected by the multi-tenant plugin's required field.
  const site = refId(data.site ?? originalDoc?.site)
  if (site !== undefined && String(refId(parent.site)) !== String(site)) {
    fail("The parent Location must be on the same Site.")
  }

  if (
    selfId !== undefined &&
    parentPath.some((ancestor) => String(ancestor.id) === String(selfId))
  ) {
    fail("The parent can't be one of this Location's own sub-Locations.")
  }

  return data
}
