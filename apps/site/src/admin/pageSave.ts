import { NotFound, type Payload } from "payload"

import { TEMPLATE_IS_NOT_PUBLISHED } from "../collections/Pages"

import { derivePageStatus, type PageStatus } from "./dashboard/pageStatus"
import {
  pageDataFromDocument,
  pageDocumentFromPage,
} from "./editor/modes/pageDocument"
import type { PageDocument } from "./editor/state"
import { formStateFromError, type FormState } from "./formState"
import type { Access } from "./settingsSave"

/**
 * Saving and deleting a Page for the Visual Editor's Page mode, through the Local
 * API with the caller's access (apps/site ADR-0002). Kept apart from the
 * Server Actions so it runs in tests without Next.
 */

export type PageIntent = "draft" | "publish" | "unpublish"

const INTENTS: readonly PageIntent[] = ["draft", "publish", "unpublish"]

const MESSAGES: Record<PageIntent, string> = {
  draft: "Draft saved.",
  publish: "Published. The Page is live on the Site.",
  unpublish: "Unpublished. Visitors no longer see this Page.",
}

/** What a save returns to the editor: the state, and the Page as stored. */
export type PageSaveResult = FormState & {
  /** The saved Page's id (a new Page gets one on its first save). */
  id?: number
  status?: PageStatus
  /** The Page as stored: generated path, Block ids. */
  document?: PageDocument
}

/**
 * Saves a Page as a Draft, publishes it, or takes it off the Site. `id` is
 * null for a new Page. A Draft save keeps the Published version as it is.
 */
export async function savePageAs(
  payload: Payload,
  access: Access,
  {
    id,
    intent,
    document,
  }: { id: number | null; intent: PageIntent; document: PageDocument }
): Promise<PageSaveResult> {
  if (!INTENTS.includes(intent)) {
    return { ok: false, message: "Choose Save draft, Publish or Unpublish." }
  }
  if (document.isTemplate && intent === "publish") {
    return { ok: false, message: TEMPLATE_IS_NOT_PUBLISHED }
  }
  try {
    // A Page Template stays off the Site: a live Page is unpublished first.
    if (document.isTemplate && id && intent === "draft") {
      const live = await payload.findByID({
        collection: "pages",
        id,
        draft: false,
        depth: 0,
        select: { _status: true },
        ...access,
      })
      if (live._status === "published") {
        return {
          ok: false,
          message:
            "This Page is live on the Site. Unpublish it before making it a Page Template.",
        }
      }
    }
    const data = pageDataFromDocument(document)
    const _status = intent === "publish" ? "published" : "draft"
    const draft = intent === "draft"
    const saved = id
      ? await payload.update({
          collection: "pages",
          id,
          data: { ...data, _status },
          draft,
          depth: 0,
          ...access,
        })
      : await payload.create({
          collection: "pages",
          data: { ...data, _status },
          draft,
          depth: 0,
          ...access,
        })
    const published = await payload.findByID({
      collection: "pages",
      id: saved.id,
      draft: false,
      depth: 0,
      ...access,
    })
    return {
      ok: true,
      message: MESSAGES[intent],
      id: saved.id,
      status: derivePageStatus({
        published: published._status,
        latest: saved._status,
      }),
      document: pageDocumentFromPage(saved),
    }
  } catch (error) {
    return formStateFromError(error)
  }
}

/** Deletes a Page, with its Draft and versions. Says which Page went. */
export async function deletePageAs(
  payload: Payload,
  access: Access,
  id: number
): Promise<FormState> {
  if (!Number.isInteger(id) || id <= 0) return gone()
  try {
    const page = await payload.findByID({
      collection: "pages",
      id,
      draft: true,
      depth: 0,
      ...access,
    })
    await payload.delete({ collection: "pages", id, ...access })
    return { ok: true, message: `Deleted Page “${page.title}”.` }
  } catch (error) {
    if (error instanceof NotFound) return gone()
    return formStateFromError(error)
  }
}

const gone = (): FormState => ({
  ok: false,
  message: "That Page no longer exists.",
})
