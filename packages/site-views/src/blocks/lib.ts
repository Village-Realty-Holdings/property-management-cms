/**
 * Pure helpers for the Block renderers: reading Block fields as stored
 * (`PageDoc.blocks` is loosely typed) into safe, typed values. No React,
 * no Next imports, so `node --test` can run lib.test.ts directly.
 */

/** An `Image` as `@workspace/content` defines it (kept structural here). */
export type BlockImage = {
  url: string
  alt: string
  width?: number
  height?: number
}

export type BlockLink = { label: string; href: string }

export type BlockLocation = { id: string; slug: string; name: string }

export type BlockCuratedList = { id: string; slug: string; title: string }

type Obj = Record<string, unknown>

const isObj = (value: unknown): value is Obj =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** Trimmed text, or null when missing or empty. */
export function str(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

/**
 * Only Site paths, same-page anchors and http(s)/mailto/tel URLs (what the
 * CMS's link validation allows); anything else, e.g. `javascript:`, is null.
 */
export function safeHref(value: unknown): string | null {
  const href = str(value)
  if (!href) return null
  // A phone number as typed, e.g. from `tel:{phone}` → "tel:(888) 575-2775".
  if (/^tel:/i.test(href) && !/^tel:[+\d][\d\s-]*$/i.test(href)) {
    const digits = href.slice(4).replace(/[^\d+]/g, "")
    return /^\+?\d+$/.test(digits) ? `tel:${digits}` : null
  }
  if (/^(\/(?!\/)|#)[^\s\\]*$/.test(href)) return href
  if (/^(https?:\/\/\S+|mailto:\S+|tel:[+\d][\d\s-]*)$/i.test(href)) return href
  return null
}

/** A `{ label, href }` link group; null unless both are set and the href is safe. */
export function linkOf(value: unknown): BlockLink | null {
  if (!isObj(value)) return null
  const label = str(value.label)
  const href = safeHref(value.href)
  return label && href ? { label, href } : null
}

/** Whether a link stays on the Site (rendered with next/link). */
export const isInternalHref = (href: string) =>
  href.startsWith("/") || href.startsWith("#")

/** An absolute URL: the CMS serves local uploads at relative `/api/media/...`. */
export function absoluteUrl(
  url: string,
  baseURL: string | null
): string | null {
  if (url.startsWith("/") && !url.startsWith("//")) {
    return baseURL ? `${baseURL.replace(/\/+$/, "")}${url}` : null
  }
  return /^https?:\/\//i.test(url) ? url : null
}

/**
 * An upload field inside a Block as an Image: a populated Media document
 * (`{ url, alt, width, height }`, url possibly relative to the CMS) or an
 * already-mapped Image. An unpopulated ID, or a relative URL without a CMS
 * base URL, is null.
 */
export function imageOf(
  value: unknown,
  baseURL: string | null
): BlockImage | null {
  if (!isObj(value)) return null
  const raw = str(value.url)
  if (!raw) return null
  const url = absoluteUrl(raw, baseURL)
  if (!url) return null
  const image: BlockImage = { url, alt: str(value.alt) ?? "" }
  if (typeof value.width === "number") image.width = value.width
  if (typeof value.height === "number") image.height = value.height
  return image
}

/** A populated Location relationship; null when it's only an ID. */
export function locationOf(value: unknown): BlockLocation | null {
  if (!isObj(value)) return null
  const slug = str(value.slug)
  if (value.id == null || !slug) return null
  return {
    id: String(value.id),
    slug,
    name: str(value.displayName) ?? str(value.name) ?? slug,
  }
}

/** A populated Curated List relationship; null when it's only an ID. */
export function curatedListOf(value: unknown): BlockCuratedList | null {
  if (!isObj(value)) return null
  const slug = str(value.slug)
  if (value.id == null || !slug) return null
  return { id: String(value.id), slug, title: str(value.title) ?? slug }
}

/** Every populated Curated List of a hasMany relationship, deduplicated. */
export function curatedListsOf(value: unknown): BlockCuratedList[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const lists: BlockCuratedList[] = []
  for (const item of value) {
    const list = curatedListOf(item)
    if (list && !seen.has(list.id)) {
      seen.add(list.id)
      lists.push(list)
    }
  }
  return lists
}

/** A Property Grid's `limit`: a whole number from 1 to 24 (default 6). */
export function limitOf(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 6
  return Math.min(24, Math.max(1, Math.floor(n)))
}

/**
 * The slug path of a Location, found in its members' Location paths (a
 * Property inside it has it as a prefix). Blocks carry the Location's slug
 * and parent ID, not its path, so this is how the grid links to it. Null
 * when no member shows it.
 */
export function locationPathFrom(
  slug: string,
  memberPaths: readonly (readonly string[] | null | undefined)[]
): string[] | null {
  for (const path of memberPaths) {
    const i = path?.indexOf(slug) ?? -1
    if (path && i >= 0) return path.slice(0, i + 1)
  }
  return null
}

type LexicalNode = { type?: unknown; text?: unknown; children?: unknown }

const BLOCK_NODES = new Set([
  "paragraph",
  "heading",
  "quote",
  "listitem",
  "list",
])

/** Lexical rich text as plain text (for FAQ JSON-LD): blocks joined by newlines. */
export function lexicalText(data: unknown): string {
  const root = isObj(data) && isObj(data.root) ? data.root : null
  if (!root) return ""
  const walk = (node: LexicalNode): string => {
    if (node.type === "text" && typeof node.text === "string") return node.text
    if (node.type === "linebreak") return "\n"
    const children = Array.isArray(node.children)
      ? (node.children as LexicalNode[]).map(walk).join("")
      : ""
    return BLOCK_NODES.has(String(node.type)) && node.type !== "list"
      ? `${children}\n`
      : children
  }
  return walk(root as LexicalNode)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
}

export type FaqItem = { question: string; answer: unknown }

/** FAQ items with a question and a non-empty answer. */
export function faqItemsOf(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isObj(item)) return []
    const question = str(item.question)
    return question && lexicalText(item.answer)
      ? [{ question, answer: item.answer }]
      : []
  })
}

/** schema.org FAQPage for the items, or null when there are none. */
export function faqJsonLd(items: FaqItem[]): object | null {
  if (items.length === 0) return null
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: lexicalText(item.answer) },
    })),
  }
}

/** JSON for an inline `<script type="application/ld+json">`: `<` escaped. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}

/** URL segments the Site serves from other routes, never from a CMS Page. */
export const RESERVED_PREFIXES = [
  "rentals",
  "areas",
  "lists",
  "guides",
  "specials",
  "api",
] as const

export function isReservedPath(path: readonly string[]): boolean {
  const first = path[0]
  return (
    first !== undefined &&
    (RESERVED_PREFIXES as readonly string[]).includes(first.toLowerCase())
  )
}

/** A Location page's URL: `/areas/<root>/.../<slug>`. */
export const locationHref = (path: readonly string[]) =>
  `/areas/${path.map(encodeURIComponent).join("/")}`

/** A Curated List page's URL. */
export const curatedListHref = (slug: string) =>
  `/lists/${encodeURIComponent(slug)}`

/** Page URL segments from a stored Page path or nav href ("/" is []). */
export function segmentsOf(path: string): string[] {
  return path.split(/[?#]/)[0]!.split("/").filter(Boolean)
}
