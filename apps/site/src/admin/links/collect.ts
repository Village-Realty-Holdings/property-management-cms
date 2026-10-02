import type { Field } from "payload"

import { RESERVED_PATH_PREFIXES } from "../../collections/Pages/path"
import { rewriteFields, type LooseField } from "../replace/walk"
import type { Hit, Rewritten } from "../replace/text"

/**
 * Finds every link a document holds, by walking its data alongside the
 * Payload config of its fields (apps/site ADR-0008's walk): a text field
 * marked `LINK` (a button's link, a menu's URL), a menu link that points at a
 * Page, and the links in rich text. A Block that gains a link field is found
 * with no change here.
 */

/** A link as it is stored: a URL someone typed, or a Page a menu points at. */
export type LinkTarget =
  | { type: "url"; url: string }
  | { type: "page"; pageId: number }

/** One place a link is. */
export type FoundLink = {
  target: LinkTarget
  /** "Block 2, Hero", when it is in a Block. */
  block?: string
  /** "Cta: Link", "Item 2: Link: URL", "Content". */
  where: string
}

export type LinkKind = "internal" | "external" | "contact" | "anchor"

type Json = Record<string, unknown>

const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** A text field that holds a link's target. */
const isLinkField = (field: LooseField) =>
  field.type === "text" && field.custom?.link === true

/** A menu link's Page: a relationship to Pages. */
const pointsAtPage = (field: LooseField) =>
  field.type === "relationship" && [field.relationTo].flat().includes("pages")

/** The Page id a stored relationship holds: an id, or a populated Page. */
const pageIdOf = (value: unknown): number | null =>
  typeof value === "number"
    ? value
    : isRecord(value) && typeof value.id === "number"
      ? value.id
      : null

/** The URL of each link node in rich text, in order. */
function richTextLinks(node: unknown, found: string[] = []): string[] {
  if (!isRecord(node)) return found
  if (node.type === "link" || node.type === "autolink") {
    const url = isRecord(node.fields) ? node.fields.url : undefined
    if (typeof url === "string" && url.trim()) found.push(url.trim())
  }
  for (const child of [
    node.root,
    ...(Array.isArray(node.children) ? node.children : []),
  ]) {
    richTextLinks(child, found)
  }
  return found
}

/**
 * A menu link stores a Page and a URL side by side and shows the one its
 * `type` names. The other is left over from before a switch and leads
 * nowhere, so it is not a link.
 */
const shown = (
  field: LooseField,
  siblings: Readonly<Record<string, unknown>>
) => {
  const type = siblings.type
  if (type !== "page" && type !== "url") return true
  return pointsAtPage(field) ? type === "page" : type === "url"
}

/** Every link `data` (a document, or part of one, at depth 0) holds. */
export function linksIn(fields: readonly Field[], data: unknown): FoundLink[] {
  const links: FoundLink[] = []
  rewriteFields(
    fields,
    data,
    ({ field, value, siblings, block, where }) => {
      const at = { block: block?.label, where }
      if (!shown(field, siblings)) return value
      if (isLinkField(field)) {
        if (typeof value === "string" && value.trim()) {
          links.push({ ...at, target: { type: "url", url: value.trim() } })
        }
      } else if (pointsAtPage(field)) {
        const pageId = pageIdOf(value)
        if (pageId !== null) {
          links.push({ ...at, target: { type: "page", pageId } })
        }
      } else if (field.type === "richText") {
        for (const url of richTextLinks(value)) {
          links.push({ ...at, target: { type: "url", url } })
        }
      }
      return value
    },
    { nameGroups: true }
  )
  return links
}

/** What kind of place a URL leads to. */
export function kindOf(url: string, siteUrl?: string | null): LinkKind {
  if (url.startsWith("#")) return "anchor"
  if (/^(mailto:|tel:)/i.test(url)) return "contact"
  if (url.startsWith("/")) return "internal"
  return sitePath(url, siteUrl) === null ? "external" : "internal"
}

/**
 * The Site path a URL leads to, without its query, anchor or last slash:
 * "/stays/", "/stays?room=2#top" and "https://<this Site>/stays" are "/stays".
 * Null when the URL leaves the Site.
 */
export function sitePath(url: string, siteUrl?: string | null): string | null {
  let path = url
  if (!url.startsWith("/")) {
    if (!siteUrl) return null
    try {
      const target = new URL(url)
      if (target.host !== new URL(siteUrl).host) return null
      path = target.pathname
    } catch {
      return null
    }
  }
  if (path.startsWith("//")) return null
  const bare = path.split(/[?#]/)[0]!
  return bare.length > 1 ? bare.replace(/\/+$/, "") : bare
}

/** Whether the app itself answers at the path (the Admin, Media files). */
export const isAppPath = (path: string) =>
  RESERVED_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  )

/**
 * `fields`' data with every link to `from` pointing at `to` instead: in link
 * fields and in rich text. The URL must match as it is stored. A menu link
 * that points at a Page is not a URL, and follows its Page by itself.
 */
export function replaceLink(
  fields: readonly Field[],
  data: unknown,
  { from, to }: { from: string; to: string }
): Rewritten {
  const hits: Hit[] = []
  let count = 0

  const inRichText = (node: unknown): unknown => {
    if (!isRecord(node)) return node
    let out = node
    if (
      (node.type === "link" || node.type === "autolink") &&
      isRecord(node.fields) &&
      typeof node.fields.url === "string" &&
      node.fields.url.trim() === from
    ) {
      count++
      out = { ...node, fields: { ...node.fields, url: to } }
    }
    for (const key of ["root", "children"] as const) {
      const child = node[key]
      const next = Array.isArray(child)
        ? child.map(inRichText)
        : inRichText(child)
      const changed = Array.isArray(child)
        ? (next as unknown[]).some((item, index) => item !== child[index])
        : next !== child
      if (changed) out = { ...out, [key]: next }
    }
    return out
  }

  const rewritten = rewriteFields(
    fields,
    data,
    ({ field, value, siblings, block, where }) => {
      count = 0
      let next = value
      if (!shown(field, siblings)) return value
      if (isLinkField(field)) {
        if (typeof value === "string" && value.trim() === from) {
          count = 1
          next = to
        }
      } else if (field.type === "richText") {
        next = inRichText(value)
      }
      if (count === 0) return value
      hits.push({ block: block?.label, where, count })
      return next
    },
    { nameGroups: true }
  )
  return { data: rewritten, hits }
}
