import { NotFound, type Payload } from "payload"

import { withoutRowIds } from "../fields/rowIds"
import {
  pageDataFromDocument,
  pageDocumentFromPage,
} from "./editor/modes/pageDocument"
import { formStateFromError, type FormState } from "./formState"
import { freePagePath } from "./pageTransfer"
import type { Access } from "./settingsSave"

/**
 * Duplicate, on a row of the Pages list: a new Draft "Title (copy)" with the
 * Page's Blocks, SEO and Layout choice, at the next free path ("/about-2").
 * The copy is never published and never a Page Template, even when the Page
 * is one, and the Page it came from is untouched. Through the Local API as
 * the User (apps/site ADR-0002).
 */

/** What a duplicate reports: the copy's id, so a caller can open it. */
export type DuplicateResult = FormState & { id?: number }

const GONE = "That Page no longer exists."

export async function duplicatePageAs(
  payload: Payload,
  access: Access,
  id: unknown
): Promise<DuplicateResult> {
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return { ok: false, message: GONE }
  }
  try {
    const source = await payload.findByID({
      collection: "pages",
      id,
      draft: true,
      depth: 0,
      ...access,
    })
    const document = pageDocumentFromPage(source)
    const title = `${source.title} (copy)`
    const path = await freePagePath(payload, access, source.path)
    const created = await payload.create({
      collection: "pages",
      data: {
        ...pageDataFromDocument({
          ...document,
          title,
          path,
          blocks: withoutRowIds(document.blocks),
          isTemplate: false,
        }),
        _status: "draft",
      },
      draft: true,
      depth: 0,
      ...access,
    })
    return {
      ok: true,
      message: `Duplicated as “${title}” at ${path}.`,
      id: created.id,
    }
  } catch (error) {
    if (error instanceof NotFound) return { ok: false, message: GONE }
    return formStateFromError(error)
  }
}
