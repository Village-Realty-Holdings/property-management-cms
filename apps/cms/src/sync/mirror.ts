import type { Payload, PayloadRequest, Where } from "payload"

import type { ID } from "./mapListing"

/**
 * The one upsert/withdraw routine every mirrored collection uses
 * (docs/module-layout.md, "sync/"). A Mirror is opened per collection and
 * Site, loads the existing documents once, then:
 *
 * - `upsert` creates or updates by (Site, Feed ID) (vocabularies: by Feed ID),
 *   writing ONLY the Feed-owned fields it is given. Editorial Content, slugs,
 *   Location Level/display name/visibility and Review Moderation are never in
 *   that data, so they survive every Sync (ADR-0001, 0002, 0012). Unchanged
 *   documents aren't written at all.
 * - `withdraw` / `withdrawMissing` set `status: withdrawn`, never delete:
 *   Withdrawn documents keep everything and come back as they were when the
 *   Feed lists them again (the next `upsert` sets them Active). Vocabularies
 *   too, since deleting would break Site presentation references.
 *
 * Writes use `overrideAccess` (Feed-owned fields are read-only through the
 * API) and `context.skipRevalidation`; changes are reported to `onChange`
 * so the Sync can batch revalidation per Site (ADR-0009).
 */

export type MirroredCollection =
  | "amenities"
  | "property-types"
  | "locations"
  | "properties"
  | "specials"
  | "reviews"

export type Outcome = "created" | "updated" | "withdrawn" | "unchanged"

export type Counts = Record<Outcome, number>

export const emptyCounts = (): Counts => ({
  created: 0,
  updated: 0,
  withdrawn: 0,
  unchanged: 0,
})

/** A mirrored document as stored (depth 0). */
export type MirrorDoc = {
  id: ID
  feedId: string
  status?: string | null
  [field: string]: unknown
}

export type Change = {
  outcome: Exclude<Outcome, "unchanged">
  doc: MirrorDoc
  /** The document before the change; undefined on create. */
  previousDoc: MirrorDoc | undefined
}

/** Feed-owned fields for one record. `status` follows the Feed. */
export type FeedOwnedData = {
  feedId: string
  status: "active" | "withdrawn"
  [field: string]: unknown
}

export type MirrorOptions = {
  payload: Payload
  /** Threaded through every operation (shares its transaction, if any). */
  req?: PayloadRequest
  collection: MirroredCollection
  /** The Site for Site-scoped collections; null for the vocabularies. */
  site: ID | null
  /** Load only these Feed IDs (e.g. a single-listing sync). Default: all. */
  feedIds?: string[]
  onChange?: (change: Change) => void | Promise<void>
  /** Called when withdrawing a missing document fails; the rest continue. */
  onError?: (feedId: string, error: unknown) => void
}

export type Mirror = {
  collection: MirroredCollection
  /** The CMS ID for a Feed ID, including Withdrawn documents. */
  idOf(feedId: string): ID | undefined
  /**
   * Creates or updates the document for `data.feedId`. `createData` (e.g. a
   * Special's initial title, a Review's Pending Moderation) is written on
   * create only. Throws when the write fails.
   */
  upsert(data: FeedOwnedData, createData?: object): Promise<Outcome>
  /**
   * Marks a Feed ID as still listed without writing it (a record the Sync
   * had to skip), so `withdrawMissing` leaves its document alone.
   */
  keep(feedId: string): void
  /** Withdraws one document; "unchanged" when missing or already Withdrawn. */
  withdraw(feedId: string): Promise<Outcome>
  /** Withdraws every Active document not passed to `upsert` since opening. */
  withdrawMissing(): Promise<void>
  counts: Counts
}

export async function openMirror(options: MirrorOptions): Promise<Mirror> {
  const { payload, req, collection, site, onChange, onError } = options
  const writeOptions = {
    overrideAccess: true,
    depth: 0,
    context: { skipRevalidation: true },
    req,
  } as const

  const where: Where[] = []
  if (site !== null) where.push({ site: { equals: site } })
  if (options.feedIds) where.push({ feedId: { in: options.feedIds } })
  const { docs } = await payload.find({
    collection,
    where: where.length > 0 ? { and: where } : {},
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const byFeedId = new Map(
    (docs as unknown as MirrorDoc[]).map((doc) => [doc.feedId, doc])
  )
  const seen = new Set<string>()
  const counts = emptyCounts()

  const record = async (change: Change) => {
    byFeedId.set(change.doc.feedId, change.doc)
    counts[change.outcome]++
    await onChange?.(change)
  }

  const update = async (
    previousDoc: MirrorDoc,
    data: Partial<FeedOwnedData>
  ): Promise<Outcome> => {
    const doc = (await payload.update({
      collection,
      id: previousDoc.id,
      data: data as never,
      ...writeOptions,
    })) as unknown as MirrorDoc
    const outcome =
      previousDoc.status !== "withdrawn" && doc.status === "withdrawn"
        ? "withdrawn"
        : "updated"
    await record({ outcome, doc, previousDoc })
    return outcome
  }

  const withdraw = async (feedId: string): Promise<Outcome> => {
    const existing = byFeedId.get(feedId)
    if (!existing || existing.status === "withdrawn") return "unchanged"
    return update(existing, { status: "withdrawn" })
  }

  return {
    collection,
    counts,
    idOf: (feedId) => byFeedId.get(feedId)?.id,

    async upsert(data, createData) {
      seen.add(data.feedId)
      const existing = byFeedId.get(data.feedId)
      if (!existing) {
        const doc = (await payload.create({
          collection,
          data: {
            ...createData,
            ...data,
            ...(site === null ? {} : { site }),
          } as never,
          ...writeOptions,
        })) as unknown as MirrorDoc
        await record({ outcome: "created", doc, previousDoc: undefined })
        return "created"
      }
      if (hasFields(existing, data)) {
        counts.unchanged++
        return "unchanged"
      }
      return update(existing, data)
    },

    keep: (feedId) => {
      seen.add(feedId)
    },

    withdraw,

    async withdrawMissing() {
      for (const feedId of [...byFeedId.keys()]) {
        if (seen.has(feedId)) continue
        try {
          await withdraw(feedId)
        } catch (error) {
          onError?.(feedId, error)
        }
      }
    },
  }
}

/** Whether `doc` already has every field in `data`. */
export function hasFields(doc: MirrorDoc, data: object): boolean {
  return Object.entries(data).every(([key, value]) =>
    sameValue(doc[key], value)
  )
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/

/**
 * Deep equality between a stored value and the value the Sync would write:
 * null and undefined are equal, array rows' `id`s are ignored, relationships
 * compare by ID, dates by instant, numbers numerically.
 */
export function sameValue(stored: unknown, next: unknown): boolean {
  if (stored == null || next == null) return stored == null && next == null
  if (Array.isArray(stored) || Array.isArray(next)) {
    return (
      Array.isArray(stored) &&
      Array.isArray(next) &&
      stored.length === next.length &&
      stored.every((item, i) => sameValue(item, next[i]))
    )
  }
  if (typeof stored === "object" && typeof next === "object") {
    const a = stored as Record<string, unknown>
    const b = next as Record<string, unknown>
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    keys.delete("id")
    return [...keys].every((key) => sameValue(a[key], b[key]))
  }
  if (typeof stored === "object" && "id" in stored) {
    return sameValue((stored as { id: unknown }).id, next)
  }
  if (typeof stored === "number" || typeof next === "number") {
    return Number(stored) === Number(next)
  }
  if (
    typeof stored === "string" &&
    typeof next === "string" &&
    ISO_DATE.test(stored) &&
    ISO_DATE.test(next)
  ) {
    return new Date(stored).getTime() === new Date(next).getTime()
  }
  return stored === next
}
