import "server-only"

import type { Media } from "../payload-types"

import type { MediaOption } from "./components/MediaSelect"
import type { StaffContext } from "./session"

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
}: StaffContext): Promise<MediaOption[]> {
  const { docs } = await payload.find({
    collection: "media",
    limit: 500,
    sort: "-updatedAt",
    depth: 0,
    ...as,
  })
  return docs.map(toMediaOption)
}
