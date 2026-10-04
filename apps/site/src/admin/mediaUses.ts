import type { Field } from "payload"

import {
  blocksOf,
  pointsAtMedia,
  rewriteFields,
  type LooseField,
} from "./replace/walk"

/**
 * Finds every Media image a document shows, by walking its data alongside the
 * Payload config of its fields: any `upload` (or `relationship`) field that
 * points at Media counts, however deep it sits (in a Block, an array row, a
 * group, a tab) and in whichever Block. A Block that gains an image field is
 * found with no change here.
 */

/** One place an image is used. */
export type MediaUse = {
  mediaId: number
  /**
   * The Block holding it, when it is in one: its row id, and how to name it
   * with its place ("Block 3, Amenities"). A Block inside a Container is
   * named from the Page down: "Block 2, Container, Column 1, Image" in a
   * Container with columns, "Block 2, Container, Block 1, Image" in a stack.
   */
  block?: { id: string | null; label: string }
  /** Where in the Block, or in the document: "Image", "Amenity 2: Image". */
  where: string
}

/** The Media ids a stored upload value holds: an id, a doc, a list of either. */
function mediaIds(value: unknown): number[] {
  if (Array.isArray(value)) return value.flatMap(mediaIds)
  if (typeof value === "number") return [value]
  if (value && typeof value === "object") {
    // A polymorphic relationship stores { relationTo, value }.
    const poly = value as { relationTo?: string; value?: unknown; id?: unknown }
    if ("relationTo" in poly) {
      return poly.relationTo === "media" ? mediaIds(poly.value) : []
    }
    return typeof poly.id === "number" ? [poly.id] : []
  }
  return []
}

/** Whether any field in the config (at any depth) holds a Media image. */
export function hasMediaField(fields: readonly Field[]): boolean {
  return (fields as LooseField[]).some((field) => {
    if (pointsAtMedia(field)) return true
    if (field.type === "tabs") {
      return (field.tabs ?? []).some((tab) => hasMediaField(tab.fields))
    }
    if (field.type === "blocks") {
      return blocksOf(field).some((block) => hasMediaField(block.fields))
    }
    return "fields" in field && field.fields
      ? hasMediaField(field.fields)
      : false
  })
}

/**
 * Every Media image `data` (a document, or part of one, stored at depth 0 or
 * more) shows, with where. `fields` is the config of its fields.
 */
export function mediaUses(fields: readonly Field[], data: unknown): MediaUse[] {
  const found: MediaUse[] = []
  rewriteFields(fields, data, ({ field, value, block, where }) => {
    if (pointsAtMedia(field)) {
      for (const mediaId of mediaIds(value)) {
        found.push({ mediaId, block, where })
      }
    }
    return value
  })
  return found
}
