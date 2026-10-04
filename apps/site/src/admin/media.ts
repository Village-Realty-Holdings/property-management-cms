import "server-only"

import { NotFound, type Payload, type Where } from "payload"

import type { Media } from "../payload-types"

import type { MediaOption } from "./components/MediaSelect"
import { formStateFromError, type FormState } from "./formState"
import type { UserContext } from "./session"

/** One Media image as an option for the Admin's image pickers. */
export function toMediaOption(doc: Media): MediaOption {
  return {
    id: doc.id,
    label: doc.alt
      ? `${doc.alt} (${doc.filename})`
      : (doc.filename ?? `#${doc.id}`),
    url: doc.thumbnailURL ?? doc.url ?? null,
  }
}

/** Every Media image, as options for the Admin's image pickers. */
export async function mediaOptions({
  payload,
  as,
}: UserContext): Promise<MediaOption[]> {
  const { docs } = await payload.find({
    collection: "media",
    limit: 500,
    sort: "-updatedAt",
    depth: 0,
    ...as,
  })
  return docs.map(toMediaOption)
}

export const MEDIA_PER_PAGE = 48

export type MediaPage = {
  docs: Media[]
  /** The page shown, after clamping: 1..totalPages. */
  page: number
  /** At least 1, even when nothing matches. */
  totalPages: number
  totalDocs: number
}

/** Search text for the Media library: matches alt text or file name, ignoring case. */
function mediaSearchWhere(q: string | undefined): Where | undefined {
  const text = q?.trim()
  if (!text) return undefined
  return { or: [{ alt: { like: text } }, { filename: { like: text } }] }
}

/**
 * One page of the Media library, newest change first, 48 at a time.
 * `q` filters on alt text or file name. A page out of range is clamped.
 */
export async function loadMediaPage(
  payload: Payload,
  access: UserContext["as"],
  { q, page }: { q?: string; page?: number } = {}
): Promise<MediaPage> {
  const where = mediaSearchWhere(q)
  const requested =
    page !== undefined && Number.isInteger(page) && page >= 1 ? page : 1
  const find = (pageNumber: number) =>
    payload.find({
      collection: "media",
      where,
      sort: ["-updatedAt", "-id"],
      limit: MEDIA_PER_PAGE,
      page: pageNumber,
      depth: 0,
      ...access,
    })
  let result = await find(requested)
  const totalPages = Math.max(1, result.totalPages)
  if (requested > totalPages) result = await find(totalPages)
  return {
    docs: result.docs,
    page: Math.min(requested, totalPages),
    totalPages,
    totalDocs: result.totalDocs,
  }
}

const GONE = "That image no longer exists."

/** A form field's text, trimmed; blank means "none". */
function optionalText(data: FormData, name: string): string | null {
  const value = String(data.get(name) ?? "").trim()
  return value === "" ? null : value
}

/**
 * Saves an image's details: alt text, caption, credit and attribution. The
 * file itself is not replaced. Alt text is required; a Source URL must be a
 * full web address. Field errors come back keyed by Payload field path, such
 * as `attribution.sourceUrl`.
 */
export async function updateMediaAs(
  payload: Payload,
  access: UserContext["as"],
  id: unknown,
  data: FormData
): Promise<FormState> {
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return { ok: false, message: GONE }
  }
  const alt = String(data.get("alt") ?? "").trim()
  if (alt === "") {
    return {
      ok: false,
      message: "Some fields need attention.",
      fieldErrors: { alt: "Describe the image in alt text." },
    }
  }
  try {
    const doc = await payload.update({
      collection: "media",
      id,
      data: {
        alt,
        caption: optionalText(data, "caption"),
        credit: optionalText(data, "credit"),
        attribution: {
          author: optionalText(data, "author"),
          sourceUrl: optionalText(data, "sourceUrl"),
          licence: optionalText(data, "licence"),
        },
      },
      depth: 0,
      ...access,
    })
    return { ok: true, message: `Saved ${doc.filename ?? "the image"}.` }
  } catch (error) {
    if (error instanceof NotFound) return { ok: false, message: GONE }
    return formStateFromError(error)
  }
}
