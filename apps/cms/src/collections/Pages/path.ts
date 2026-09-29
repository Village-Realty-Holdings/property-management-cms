import type { TextFieldSingleValidation } from "payload"

/**
 * Path prefixes the Site app routes itself (Properties, Locations, Curated
 * Lists, Guides, Specials, its API). A Page can't live at or under them.
 */
export const RESERVED_PATH_PREFIXES = [
  "/rentals",
  "/areas",
  "/lists",
  "/guides",
  "/specials",
  "/api",
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
  if (reserved) return `"${reserved}" is used by the Site; choose another path.`
  return true
}

/**
 * `validate` for Pages.path: the shape above, and unique on the Page's Site.
 * The `(site, path)` unique index is the guarantee; this gives Editors a
 * readable message instead of a database error.
 */
export const validatePagePath: TextFieldSingleValidation = async (
  value,
  { data, id, req }
) => {
  const shape = checkPagePath(value)
  if (shape !== true) return shape

  const site = idOf((data as { site?: unknown } | undefined)?.site)
  if (site === undefined || !req?.payload) return true

  const { totalDocs } = await req.payload.count({
    collection: "pages",
    req,
    where: {
      and: [
        { site: { equals: site } },
        { path: { equals: value } },
        ...(id === undefined ? [] : [{ id: { not_equals: id } }]),
      ],
    },
  })
  return totalDocs === 0 ? true : "Another Page on this Site uses this path."
}

function idOf(ref: unknown): number | string | undefined {
  const id =
    ref && typeof ref === "object" && "id" in ref
      ? (ref as { id: unknown }).id
      : ref
  return typeof id === "number" || typeof id === "string" ? id : undefined
}
