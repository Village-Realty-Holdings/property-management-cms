import { validateHref } from "../../fields/link"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** The nodes the editor keeps whole (see richTextModel.ts). */
const SUPPORTED = new Set([
  "root",
  "paragraph",
  "text",
  "linebreak",
  "tab",
  "heading",
  "quote",
  "list",
  "listitem",
  "link",
])

/** Whether `node` and everything under it is something the editor keeps whole. */
function keepsWhole(node: unknown): boolean {
  if (!isRecord(node) || typeof node.type !== "string") return false
  if (!SUPPORTED.has(node.type)) return false
  switch (node.type) {
    case "list":
      if (node.listType !== "bullet" && node.listType !== "number") return false
      break
    case "listitem":
      if (typeof node.checked === "boolean") return false
      break
    case "heading":
      if (typeof node.tag !== "string" || !/^h[1-6]$/.test(node.tag)) {
        return false
      }
      break
    case "link": {
      const url = isRecord(node.fields) ? node.fields.url : undefined
      if (typeof url !== "string" || url === "") return false
      if (validateHref(url) !== true) return false
      break
    }
  }
  const { children } = node
  return (
    children === undefined ||
    (Array.isArray(children) && children.every(keepsWhole))
  )
}

/**
 * Whether the Rich text Block's `content` can be edited in place: everything
 * in it is a node the editor keeps whole, and its links are ones it would
 * write. No content at all can (it starts as an empty paragraph). Anything
 * else (a rule, a checklist, a link that is not a URL or a Site path) is
 * edited in the Block tab, so the editor never drops or rewrites it.
 *
 * It needs no editor, so the Site's Rich text Block can ask without loading
 * one.
 */
export function canEditInPlace(content: unknown): boolean {
  if (content === null || content === undefined) return true
  return isRecord(content) && keepsWhole(content.root)
}
