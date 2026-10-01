import type { FieldHook, TextFieldSingleValidation } from "payload"

import { normalizePath } from "../../layouts/resolve"
import { checkPagePath } from "../Pages/path"

/**
 * Checks one of a Layout's path prefixes: a Page path ("/stays",
 * "/company/team") that isn't "/" (the default Layout already covers the
 * whole Site) and isn't under a prefix the app routes itself. Returns `true`
 * or an error message.
 */
export function checkLayoutPath(value: unknown): true | string {
  if (value === "/") {
    return 'A Layout path can\'t be "/". Make it the default Layout to cover the whole Site.'
  }
  return checkPagePath(value)
}

type PathRow = { path?: unknown } | null | undefined

/**
 * `beforeValidate` for a Layout's path: tidy what was typed ("stays/" becomes
 * "/stays") with the same rule the Layout resolver uses, so a saved prefix
 * matches what resolution compares. Anything empty is left for the validator.
 */
export const normalizeLayoutPath: FieldHook = ({ value }) => {
  if (typeof value !== "string" || value.trim() === "") return value
  return normalizePath(value)
}

/**
 * `validate` for a Layout's path: the shape above, listed once in this
 * Layout, and not used by another Layout. Checked here so the message is
 * readable; longest-prefix resolution needs each prefix to belong to one Layout.
 */
export const validateLayoutPath: TextFieldSingleValidation = async (
  value,
  { data, id, req }
) => {
  const shape = checkLayoutPath(value)
  if (shape !== true) return shape

  const rows = (data as { paths?: PathRow[] } | undefined)?.paths ?? []
  const listed = rows.filter((row) => row?.path === value).length
  if (listed > 1) return "This path is listed twice."

  if (!req?.payload) return true
  const { totalDocs } = await req.payload.count({
    collection: "layouts",
    req,
    where: {
      and: [
        { "paths.path": { equals: value } },
        ...(id === undefined ? [] : [{ id: { not_equals: id } }]),
      ],
    },
  })
  return totalDocs === 0 ? true : "Another Layout uses this path."
}
