import type { FieldHook, TextFieldSingleValidation } from "payload"

import { slugify } from "../../fields/slug"

/**
 * Top-level paths the app routes itself (the Admin, Payload's admin, REST,
 * sign-in, Media files). A Page can't live at or under them.
 */
export const RESERVED_PATH_PREFIXES = [
  "/admin",
  "/p-admin",
  "/api",
  "/auth",
  "/media",
] as const

/**
 * Checks a Page path's shape: "/" (Home) or lower-case segments like
 * "/about" or "/company/team", with no trailing or double slashes, outside
 * the reserved prefixes. Returns `true` or an error message.
 */
export function checkPagePath(value: unknown): true | string {
  if (typeof value !== "string" || value === "") return "A path is required."
  if (!value.startsWith("/")) return 'The path must start with "/".'
  if (value === "/") return true
  if (value.includes("//")) return "The path can't contain double slashes."
  if (value.endsWith("/")) return 'Only Home ("/") ends with a slash.'
  if (!/^(\/[a-z0-9]+(-[a-z0-9]+)*)+$/.test(value)) {
    return 'Use lower-case letters, numbers and hyphens, like "/about" or "/company/team".'
  }
  const reserved = RESERVED_PATH_PREFIXES.find(
    (prefix) => value === prefix || value.startsWith(`${prefix}/`)
  )
  if (reserved) return `"${reserved}" is used by the app; choose another path.`
  return true
}

/**
 * `validate` for Pages.path: the shape above, and unused by another Page.
 * The unique index is the guarantee; this gives a readable message instead
 * of a database error.
 */
export const validatePagePath: TextFieldSingleValidation = async (
  value,
  { id, req }
) => {
  const shape = checkPagePath(value)
  if (shape !== true) return shape
  if (!req?.payload) return true

  const { totalDocs } = await req.payload.count({
    collection: "pages",
    req,
    where: {
      and: [
        { path: { equals: value } },
        ...(id === undefined ? [] : [{ id: { not_equals: id } }]),
      ],
    },
  })
  return totalDocs === 0 ? true : "Another Page uses this path."
}

/**
 * The path a Page gets from its title: `"/" + slugify(title)`, and "/" for
 * a Page titled "Home". Null when the title gives nothing usable.
 */
export function defaultPagePath(title: unknown): string | null {
  if (typeof title !== "string") return null
  const slug = slugify(title)
  if (!slug) return null
  return slug === "home" ? "/" : `/${slug}`
}

/**
 * `beforeValidate` for Pages.path: on create, an empty path defaults from
 * the title. An explicit path, "/" included, is kept.
 */
export const defaultPathFromTitle: FieldHook = ({
  operation,
  siblingData,
  value,
}) => {
  if (operation !== "create" || (typeof value === "string" && value !== "")) {
    return value
  }
  return defaultPagePath((siblingData as { title?: unknown }).title) ?? value
}
