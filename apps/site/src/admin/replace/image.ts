import type { Field, Payload } from "payload"

import type { Access } from "../settingsSave"
import type { Replacement } from "./run"
import type { Hit, Rewritten } from "./text"
import { pointsAtMedia, rewriteFields } from "./walk"

/**
 * Replace Image: every image field that shows one Media shows another
 * instead. The data is as stored, at depth 0, where an image field holds a
 * Media id (or a list of them).
 */
export function replaceMedia(
  fields: readonly Field[],
  data: unknown,
  { from, to }: { from: number; to: number }
): Rewritten {
  const hits: Hit[] = []
  const rewritten = rewriteFields(
    fields,
    data,
    ({ field, value, block, where }) => {
      if (!pointsAtMedia(field)) return value
      if (value === from) {
        hits.push({ block: block?.label, where, count: 1 })
        return to
      }
      if (Array.isArray(value) && value.includes(from)) {
        hits.push({
          block: block?.label,
          where,
          count: value.filter((id) => id === from).length,
        })
        return value.map((id) => (id === from ? to : id))
      }
      return value
    },
    { nameGroups: true }
  )
  return { data: rewritten, hits }
}

type Loaded =
  | { ok: true; replacement: Replacement }
  | { ok: false; message: string }

const isId = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0

/**
 * The swap as a site-wide replace, once both images are known to be in the
 * Media library. The Brand and SEO are searched too: they show images.
 */
export async function loadMediaReplacement(
  payload: Payload,
  access: Access,
  input: unknown
): Promise<Loaded> {
  const { from, to, includeTemplates } = (input ?? {}) as {
    from?: unknown
    to?: unknown
    includeTemplates?: unknown
  }
  if (!isId(from)) return { ok: false, message: "Choose the image to replace." }
  if (!isId(to))
    return { ok: false, message: "Choose the image to use instead." }
  if (from === to) {
    return { ok: false, message: "Choose two different images." }
  }
  const { docs } = await payload.find({
    collection: "media",
    where: { id: { in: [from, to] } },
    depth: 0,
    select: { filename: true },
    ...access,
  })
  const name = (id: number) => docs.find((doc) => doc.id === id)?.filename
  if (!name(from) || !name(to)) {
    return { ok: false, message: "One of those images is no longer in Media." }
  }
  return {
    ok: true,
    replacement: {
      rewrite: (fields, data) => replaceMedia(fields, data, { from, to }),
      summary: `Replace Image: “${name(from)}” with “${name(to)}”`,
      settings: true,
      templates: includeTemplates === true,
    },
  }
}
