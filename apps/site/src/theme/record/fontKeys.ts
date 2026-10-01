import type { Payload, PayloadRequest } from "payload"

import { BUILT_IN_FONTS } from "../../fonts/builtIn"

/** A font input as stored: `built-in:<family>` or `font:<id>` (AvailableFont.key). */
export type ParsedFontKey =
  | { kind: "built-in"; family: string }
  | { kind: "stored"; id: number }

export function parseFontKey(key: unknown): ParsedFontKey | null {
  if (typeof key !== "string") return null
  if (key.startsWith("built-in:")) {
    const family = key.slice("built-in:".length)
    return BUILT_IN_FONTS.some((font) => font.family === family)
      ? { kind: "built-in", family }
      : null
  }
  const stored = /^font:([1-9]\d{0,9})$/.exec(key)
  return stored ? { kind: "stored", id: Number(stored[1]) } : null
}

/** The ids of the stored Fonts that exist. */
export async function storedFontIds(
  payload: Payload,
  req?: PayloadRequest
): Promise<Set<number>> {
  const { docs } = await payload.find({
    collection: "fonts",
    depth: 0,
    pagination: false,
    select: {},
    req,
  })
  return new Set(docs.map((font) => Number(font.id)))
}

/** `true`, or why the key can't be a Theme font. */
export async function checkFontKey(
  key: unknown,
  label: string,
  payload: Payload,
  req?: PayloadRequest
): Promise<true | string> {
  const parsed = parseFontKey(key)
  if (!parsed) return `Pick the ${label.toLowerCase()} from the list.`
  if (parsed.kind === "built-in") return true
  const found = await payload.count({
    collection: "fonts",
    where: { id: { equals: parsed.id } },
    req,
  })
  return found.totalDocs > 0
    ? true
    : `The ${label.toLowerCase()} you picked was deleted. Pick another.`
}
