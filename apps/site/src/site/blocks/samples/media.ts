import type { Media } from "../../../payload-types"

/**
 * A Media record for sample data: a picture from `public/block-samples`,
 * which the Site serves itself, so the catalogue fetches nothing from
 * another origin.
 */
export function sampleMedia(id: number, file: string, alt: string): Media {
  return {
    id,
    url: `/block-samples/${file}`,
    alt,
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
  }
}
