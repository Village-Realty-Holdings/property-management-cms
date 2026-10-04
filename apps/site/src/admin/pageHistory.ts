import { NotFound, type Payload } from "payload"

import { withoutRowIds } from "../fields/rowIds"
import type { Page } from "../payload-types"
import { formatSavedAt } from "../theme/record/summary"

import { derivePageStatus, type PageStatus } from "./dashboard/pageStatus"
import {
  pageDataFromDocument,
  pageDocumentFromPage,
} from "./editor/modes/pageDocument"
import type { PageDocument } from "./editor/state"
import { formStateFromError, type FormState } from "./formState"
import { staleSaveRefusal } from "./revision"
import type { Access } from "./settingsSave"
import {
  latestRevision,
  type RevisionResult,
  type SaveGuard,
} from "./staleSave"

/**
 * A Page's version history and Restore, through the Local API with the
 * caller's access (apps/site ADR-0002). Every save keeps a version (up to the
 * cap on the collection). Restore saves an old version's content as a new
 * Draft, so the history only grows and nothing live changes until the User
 * publishes. Kept apart from the Server Actions so it runs in tests without
 * Next.
 */

/** One saved version, as the History tab shows it. */
export type PageVersionRow = {
  /** The version's id, for `restorePageVersionAs`. */
  id: number
  /** ISO time of the save; the History tab shows it in the viewer's time zone. */
  savedAt: string
  /** Who saved it; null when no User did (a script) or that User is gone. */
  author: string | null
  /** Whether the save was a Draft or a publish. */
  status: "draft" | "published"
  /** The newest version: what the editor opens on. */
  isLatest: boolean
}

/** What a restore answers: the stored Draft, to start the editor from again. */
export type PageRestoreResult = FormState &
  RevisionResult & {
    id?: number
    status?: PageStatus
    document?: PageDocument
    history?: PageVersionRow[]
  }

const VERSION_GONE = "That version no longer exists."

/** Every kept version of a Page, newest first. Users only. */
export async function readPageVersionRows(
  payload: Payload,
  access: Access,
  id: number
): Promise<PageVersionRow[]> {
  const { docs } = await payload.findVersions({
    collection: "pages",
    where: { parent: { equals: id } },
    // Only what a row shows: not every Media and Layout in every Block.
    select: { createdAt: true, version: { _status: true, updatedBy: true } },
    populate: { users: { name: true, email: true } },
    depth: 1,
    pagination: false,
    sort: "-id",
    ...access,
  })
  return docs.map((entry, index) => {
    const author = entry.version.updatedBy
    return {
      id: Number(entry.id),
      savedAt: String(entry.createdAt),
      author:
        author && typeof author === "object"
          ? author.name || author.email
          : null,
      status: entry.version._status === "published" ? "published" : "draft",
      isLatest: index === 0,
    }
  })
}

/**
 * Saves an earlier version of the Page as a new Draft. The title, path,
 * Blocks, Layout choice and SEO come back; whether the Page is a Page
 * Template stays as it is now. A Layout deleted since is cleared from the
 * version by the database, so the Page falls back to the Layout its path
 * gives it.
 */
export async function restorePageVersionAs(
  payload: Payload,
  access: Access,
  id: number,
  versionId: number,
  guard: SaveGuard = {}
): Promise<PageRestoreResult> {
  if (!Number.isInteger(id) || id <= 0) return gone("That Page")
  if (!Number.isInteger(versionId) || versionId <= 0)
    return gone("That version")
  try {
    const found = await payload
      .findVersionByID({
        collection: "pages",
        id: String(versionId),
        depth: 0,
        ...access,
      })
      .catch((error: unknown) => {
        if (error instanceof NotFound) return null
        throw error
      })
    if (!found || String(found.parent) !== String(id)) {
      return { ok: false, message: VERSION_GONE }
    }
    const stale = await staleSaveRefusal(
      payload,
      access,
      { kind: "page", id },
      guard
    )
    if (stale) return stale
    const current = await payload.findByID({
      collection: "pages",
      id,
      draft: true,
      depth: 0,
      ...access,
    })

    const old = pageDocumentFromPage({ ...found.version, id } as Page)
    // A deleted Layout was cleared from the version (ON DELETE set null), so
    // `old.layout` is already the route mode then.
    const document: PageDocument = {
      ...old,
      isTemplate: current.isTemplate === true,
    }
    const saved = await payload.update({
      collection: "pages",
      id,
      data: {
        ...withoutRowIds(pageDataFromDocument(document)),
        _status: "draft",
      },
      draft: true,
      depth: 0,
      ...access,
    })
    const [published, history] = await Promise.all([
      payload.findByID({
        collection: "pages",
        id,
        draft: false,
        depth: 0,
        ...access,
      }),
      readPageVersionRows(payload, access, id),
    ])
    return {
      ok: true,
      message: `Restored the version from ${formatSavedAt(String(found.createdAt))}. It is saved as a Draft; publish it to put it on the Site.`,
      id,
      status: derivePageStatus({
        published: published._status,
        latest: saved._status,
      }),
      document: pageDocumentFromPage(saved),
      history,
      revision: latestRevision(history),
    }
  } catch (error) {
    if (error instanceof NotFound) return gone("That Page")
    return formStateFromError(error)
  }
}

const gone = (what: string): PageRestoreResult => ({
  ok: false,
  message: `${what} no longer exists.`,
})
