import type { FieldHook } from "payload"

import { slugify } from "../../fields/slug"

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
 * the title (the admin fills it in as the Editor types; this covers API
 * clients). An explicit path, "/" included, is kept.
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
