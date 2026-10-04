import type { Payload } from "payload"

import type { Access } from "./settingsSave"
import {
  staleSaveMessage,
  type Revision,
  type SaveConflict,
  type SaveGuard,
} from "./staleSave"

/**
 * The revision of a Page, Layout, Theme, Brand or SEO: what a save compares
 * against to refuse a save over someone else's change (see staleSave.ts).
 * Through the Local API with the caller's access (apps/site ADR-0002).
 */

export type RevisionTarget =
  | { kind: "page"; id: number }
  | { kind: "layout"; id: number }
  | { kind: "theme" }
  | { kind: "brand" }
  | { kind: "seo" }

export type RevisionInfo = {
  revision: Revision | null
  /** ISO time of the latest save. */
  at: string | null
  /** Name or email of who saved; null for Brand/SEO, a script or a removed User. */
  by: string | null
  byId: number | null
}

const NONE: RevisionInfo = { revision: null, at: null, by: null, byId: null }

type VersionEntry = {
  id: number | string
  createdAt?: unknown
  version?: { updatedBy?: unknown }
}

function infoOfVersion(entry: VersionEntry | undefined): RevisionInfo {
  if (!entry) return NONE
  const author = entry.version?.updatedBy
  const user =
    author && typeof author === "object"
      ? (author as { id: number; name?: string | null; email: string })
      : null
  return {
    revision: String(entry.id),
    at: String(entry.createdAt),
    by: user ? user.name || user.email : null,
    byId: user ? user.id : null,
  }
}

/** The latest revision of the target, and who saved it and when. */
export async function readRevision(
  payload: Payload,
  access: Access,
  target: RevisionTarget
): Promise<RevisionInfo> {
  switch (target.kind) {
    case "page":
    case "layout": {
      const { docs } = await payload.findVersions({
        collection: target.kind === "page" ? "pages" : "layouts",
        where: { parent: { equals: target.id } },
        select: { createdAt: true, version: { updatedBy: true } },
        populate: { users: { name: true, email: true } },
        depth: 1,
        limit: 1,
        sort: "-id",
        ...access,
      })
      return infoOfVersion(docs[0] as VersionEntry | undefined)
    }
    case "theme": {
      const { docs } = await payload.findGlobalVersions({
        slug: "theme",
        depth: 1,
        limit: 1,
        sort: "-id",
        ...access,
      })
      return infoOfVersion(docs[0] as VersionEntry | undefined)
    }
    case "brand":
    case "seo": {
      const doc = await payload.findGlobal({
        slug: target.kind,
        depth: 0,
        ...access,
      })
      const revision = globalRevision(doc)
      return { revision, at: revision, by: null, byId: null }
    }
  }
}

/** The Brand/SEO token of a stored global. */
export const globalRevision = (doc: {
  updatedAt?: string | null
}): Revision | null => doc.updatedAt ?? null

/** null = go ahead; otherwise the refusal to return as is. */
export async function staleSaveRefusal(
  payload: Payload,
  access: Access,
  target: RevisionTarget,
  guard: SaveGuard = {}
): Promise<{ ok: false; message: string; conflict: SaveConflict } | null> {
  if (guard.expected === undefined || guard.force) return null
  const info = await readRevision(payload, access, target)
  // Nothing stored: let the write report "no longer exists" itself.
  if (info.revision === null || info.revision === guard.expected) return null
  return {
    ok: false,
    message: staleSaveMessage(target.kind),
    conflict: {
      kind: target.kind,
      by: info.by,
      byYou: info.byId != null && info.byId === access.user?.id,
      at: info.at ?? "",
    },
  }
}
