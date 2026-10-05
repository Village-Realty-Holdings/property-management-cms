import type { Payload, TypedUser } from "payload"

import type { Layout } from "../payload-types"
import { formatSavedAt } from "../theme/record/summary"

/**
 * The Layout record, server side (apps/site ADR-0006). A Layout goes live on
 * save and keeps every version, like the Theme (ADR-0004). Writes run as the
 * User (ADR-0002), never around access.
 */

type User = TypedUser

/** What a save sets. On an update, what is left out stays as it is. */
export type LayoutData = {
  name?: string
  header?: Layout["header"]
  footer?: Layout["footer"]
  paths?: Layout["paths"]
  isDefault?: boolean
}

export type LayoutVersion = {
  /** The version's id, for `restoreLayoutVersion`. */
  id: number
  /** ISO time. */
  savedAt: string
  author: { id: number; name: string; email: string | null } | null
  summary: string
  name: string
  header: Layout["header"]
  footer: Layout["footer"]
  paths: string[]
  isDefault: boolean
  /** The newest version is the one on the Site. */
  isLive: boolean
}

/**
 * Saves a Layout, live at once: creates it, or updates it when `id` is given.
 * `note` replaces the automatic change summary of the version. Every save
 * makes a version, even one that changes nothing ("Saved again").
 */
export async function saveLayout(
  payload: Payload,
  options: {
    user: User
    note?: string | null
  } & (
    | { id?: undefined; data: LayoutData & { name: string } }
    | { id: number; data: LayoutData }
  )
): Promise<Layout> {
  const access = {
    depth: 0,
    overrideAccess: false,
    user: options.user,
  } as const
  const note = options.note?.trim() || null
  if (options.id === undefined) {
    return payload.create({
      collection: "layouts",
      data: { ...options.data, note },
      ...access,
    })
  }
  return payload.update({
    collection: "layouts",
    id: options.id,
    data: { ...options.data, note },
    ...access,
  })
}

/** Every version of a Layout, newest first (the first is live). Users only. */
export async function listLayoutHistory(
  payload: Payload,
  options: { user: User; id: number }
): Promise<LayoutVersion[]> {
  const { docs } = await payload.findVersions({
    collection: "layouts",
    where: { parent: { equals: options.id } },
    depth: 1,
    pagination: false,
    sort: "-id",
    overrideAccess: false,
    user: options.user,
  })
  return docs.map((entry, index) => {
    const version = entry.version
    const author = version.updatedBy
    return {
      id: Number(entry.id),
      savedAt: String(entry.createdAt),
      author:
        author && typeof author === "object"
          ? {
              id: author.id,
              name: author.name || author.email,
              email: author.email,
            }
          : null,
      summary: version.changeSummary ?? "",
      name: version.name ?? "",
      header: version.header ?? [],
      footer: version.footer ?? [],
      paths: (version.paths ?? []).map((row) => row.path),
      isDefault: Boolean(version.isDefault),
      isLive: index === 0,
    }
  })
}

/**
 * Puts an old version live again by saving its content as a new version, so
 * the history only grows. The name, Header, Footer and paths come back; the
 * default flag stays as it is now, because there is always exactly one
 * default and restoring must not move it.
 */
export async function restoreLayoutVersion(
  payload: Payload,
  options: { user: User; id: number; versionId: number }
): Promise<Layout> {
  const found = await payload
    .findVersionByID({
      collection: "layouts",
      id: String(options.versionId),
      depth: 0,
      overrideAccess: false,
      user: options.user,
    })
    .catch((error: unknown) => {
      if ((error as { status?: number }).status === 404) return null
      throw error
    })
  if (!found || String(found.parent) !== String(options.id)) {
    throw new Error("That version no longer exists.")
  }

  const old = found.version
  return saveLayout(payload, {
    user: options.user,
    id: options.id,
    data: {
      name: old.name,
      header: old.header ?? [],
      footer: old.footer ?? [],
      paths: old.paths ?? [],
    },
    note: `Restored the version from ${formatSavedAt(String(found.createdAt))}`,
  })
}
