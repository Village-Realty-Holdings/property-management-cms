import type { Field } from "payload"

import type { Replacement } from "./run"
import { rewriteFields, type LooseField } from "./walk"

/**
 * Replace Text: finds a string in the words a document shows and puts another
 * in its place. It reads `text` and `textarea` fields and the text of rich
 * text. A field marked `NOT_PROSE` (a path, a link's URL, an icon's name)
 * holds a value, not words, and is left alone, as are the URLs of rich text
 * links.
 *
 * Rich text is matched one run at a time, so a match that starts in plain
 * text and ends in bold is not found.
 */

export type TextQuery = {
  find: string
  replaceWith: string
  caseSensitive: boolean
  wholeWord: boolean
}

/** One place a rewrite changed (or would change). */
export type Hit = {
  /** "Block 2, Hero", when it is in a Block. */
  block?: string
  /** "Heading", "Question 2: Answer". */
  where: string
  /** How many replacements there. */
  count: number
}

/** A document's data after a rewrite, and what changed. */
export type Rewritten = { data: unknown; hits: Hit[] }

export const FIND_MAX = 200

type Parsed = { ok: true; query: TextQuery } | { ok: false; message: string }

/** Checks what the form sent. Nothing is trimmed: a space can be meant. */
export function parseTextQuery(input: unknown): Parsed {
  const raw = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >
  const find = typeof raw.find === "string" ? raw.find : ""
  const replaceWith = typeof raw.replaceWith === "string" ? raw.replaceWith : ""
  if (find.trim() === "") {
    return { ok: false, message: "Enter the text to find." }
  }
  if (find.length > FIND_MAX || replaceWith.length > FIND_MAX) {
    return {
      ok: false,
      message: `Keep both texts to ${FIND_MAX} characters or fewer.`,
    }
  }
  if (find === replaceWith) {
    return { ok: false, message: "The replacement is the same as the text." }
  }
  return {
    ok: true,
    query: {
      find,
      replaceWith,
      caseSensitive: raw.caseSensitive === true,
      wholeWord: raw.wholeWord === true,
    },
  }
}

const WORD = "[\\p{L}\\p{N}_]"

function matcher(query: TextQuery): RegExp {
  const literal = query.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const source = query.wholeWord ? `(?<!${WORD})${literal}(?!${WORD})` : literal
  return new RegExp(source, query.caseSensitive ? "gu" : "giu")
}

/** A text field that holds prose: one not marked as a value (`NOT_PROSE`). */
const isProse = (field: LooseField) =>
  (field.type === "text" || field.type === "textarea") &&
  (field.custom as { prose?: unknown } | undefined)?.prose !== false

type Json = Record<string, unknown>

const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** `fields`' data with the query's text replaced, and where. */
export function replaceText(
  fields: readonly Field[],
  data: unknown,
  query: TextQuery
): Rewritten {
  const pattern = matcher(query)
  const hits: Hit[] = []

  let count = 0
  const inString = (value: string) =>
    value.replace(pattern, () => {
      count++
      return query.replaceWith
    })

  /** Lexical JSON with the text of its text nodes replaced. */
  const inRichText = (node: unknown): unknown => {
    if (!isRecord(node)) return node
    if (node.type === "text" && typeof node.text === "string") {
      const text = inString(node.text)
      return text === node.text ? node : { ...node, text }
    }
    let out = node
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
    ({ field, value, block, where }) => {
      count = 0
      let next = value
      if (field.type === "richText") {
        next = inRichText(value)
      } else if (isProse(field)) {
        if (typeof value === "string") next = inString(value)
        else if (Array.isArray(value)) {
          next = value.map((item) =>
            typeof item === "string" ? inString(item) : item
          )
        }
      }
      if (count === 0) return value
      hits.push({ block: block?.label, where, count })
      return next
    },
    { nameGroups: true }
  )
  return { data: rewritten, hits }
}

/** The query as a site-wide replace. The Brand and SEO are not searched. */
export function textReplacement(query: TextQuery): Replacement {
  return {
    rewrite: (fields, data) => replaceText(fields, data, query),
    summary: `Replace Text: “${query.find}” with “${query.replaceWith}”`,
    settings: false,
  }
}
