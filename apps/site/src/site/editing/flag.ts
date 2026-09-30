/**
 * The editing flag: a Site route requested with `?__edit=1` by a signed-in
 * Staff User renders the Visual Editor's canvas instead of the Page (see
 * EditingPage). Pure, so both the route and the Admin can share it. A request
 * without the flag, or by anyone else, is an ordinary Site request.
 */
export const EDIT_PARAM = "__edit"

type SearchParams = Record<string, string | string[] | undefined>

/** Whether the request's search params ask for the editing canvas. */
export function isEditingRequest(searchParams: SearchParams | undefined) {
  const value = searchParams?.[EDIT_PARAM]
  return (Array.isArray(value) ? value : [value]).includes("1")
}

/** The Site route at `path` in editing mode: the canvas iframe's `src`. */
export function editingUrl(path: string): string {
  const [pathname = "/", query = ""] = path.split("?")
  const params = new URLSearchParams(query)
  params.set(EDIT_PARAM, "1")
  return `${pathname}?${params}`
}
