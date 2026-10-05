import { normalizeInputs, type ThemeInputs } from "../../theme/inputs"
import { DEFAULT_INPUTS } from "../../theme/presets"

/**
 * The editing flag: a Site route requested with `?__edit=1` by a signed-in
 * User renders the Visual Editor's canvas instead of the Page (see
 * EditingPage). Pure, so both the route and the Admin can share it. A request
 * without the flag, or by anyone else, is an ordinary Site request.
 */
export const EDIT_PARAM = "__edit"

/**
 * The unsaved Theme, as JSON: Theme mode puts it on the canvas's URL when it
 * moves the canvas to another Page, so the Page is drawn with it from the
 * first paint instead of with the live Theme until the Admin's message
 * arrives. Only the editing canvas reads it (see EditingPage).
 */
export const THEME_PARAM = "__theme"

type SearchParams = Record<string, string | string[] | undefined>

/** Whether the request's search params ask for the editing canvas. */
export function isEditingRequest(searchParams: SearchParams | undefined) {
  const value = searchParams?.[EDIT_PARAM]
  return (Array.isArray(value) ? value : [value]).includes("1")
}

/**
 * The Site route at `path` in editing mode: the canvas iframe's `src`. In
 * Theme mode `theme` is the unsaved Theme the canvas starts with.
 */
export function editingUrl(path: string, theme?: ThemeInputs): string {
  const [pathname = "/", query = ""] = path.split("?")
  const params = new URLSearchParams(query)
  params.set(EDIT_PARAM, "1")
  if (theme) params.set(THEME_PARAM, JSON.stringify(theme))
  else params.delete(THEME_PARAM)
  return `${pathname}?${params}`
}

/**
 * The unsaved Theme a canvas request carries, or null when it carries none (or
 * something that is not a Theme). Values a Theme cannot have are dropped, the
 * rest taken from the default Theme, like everything else the Admin posts.
 */
export function readThemeParam(
  searchParams: SearchParams | undefined
): ThemeInputs | null {
  const value = searchParams?.[THEME_PARAM]
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return null
  return normalizeInputs(parsed, DEFAULT_INPUTS)
}
