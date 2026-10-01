import { after } from "next/server"
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionSlug,
  Payload,
  PayloadRequest,
  SanitizedCollectionConfig,
} from "payload"

import { uniqueTags, type CacheTag } from "@workspace/content/shared"

import { notify, notifyAllSites, type SiteRef } from "./notify"

export type TagsForArgs<TDoc> = {
  /** The document as the Site now sees it. */
  doc: TDoc
  /**
   * The document as the Site saw it before the change: the previous
   * published version for collections with drafts. Undefined on create and
   * delete, or when there was none.
   */
  previousDoc: TDoc | undefined
  collection: CollectionSlug
  operation: "create" | "update" | "delete"
  payload: Payload
  /** Pass to lookups (e.g. a Review's Property slug) so they see the save's transaction. */
  req: PayloadRequest
}

/** The cache tags a change to one document affects. Include tags from `previousDoc` (e.g. an old slug). */
export type TagsFor<TDoc> = (
  args: TagsForArgs<TDoc>
) => CacheTag[] | Promise<CacheTag[]>

type Doc = Record<string, unknown> & { id: number | string }

/** What changed on the Site: the published document before and after. */
type PublishedChange = { doc: Doc; previousDoc: Doc | undefined }

/**
 * afterChange/afterDelete hooks that send `tagsFor`'s tags to the owning
 * Site's deployment (ADR-0009). Attach per collection:
 *
 *   hooks: { ...revalidationHooks(tagPresets.properties) }
 *
 * - The Site is the document's `site`. A Site document revalidates itself.
 *   Collections that aren't Site-scoped (Amenities, Property Types) notify
 *   every Site.
 * - Skipped when `req.context.skipRevalidation` is set (the Sync batches).
 * - With drafts, only changes to the published version notify (publish,
 *   unpublish, delete of a published document), with tags from the new and
 *   the previous published version. Saving a draft doesn't.
 * - Tags are computed during the save; the request to the Site is sent
 *   after the response. Never fails the save.
 */
export function revalidationHooks<TDoc>(tagsFor: TagsFor<TDoc>): {
  afterChange: CollectionAfterChangeHook[]
  afterDelete: CollectionAfterDeleteHook[]
} {
  const afterChange: CollectionAfterChangeHook = async ({
    collection,
    doc,
    operation,
    previousDoc,
    req,
  }) => {
    if (req.context.skipRevalidation) return doc
    await revalidate(req, collection, tagsFor, operation, () =>
      publishedChange(req, collection, operation, doc, previousDoc)
    )
    return doc
  }

  const afterDelete: CollectionAfterDeleteHook = async ({
    collection,
    doc,
    req,
  }) => {
    if (req.context.skipRevalidation) return doc
    await revalidate(req, collection, tagsFor, "delete", async () =>
      !hasDrafts(collection) || isPublished(doc)
        ? { doc, previousDoc: undefined }
        : null
    )
    return doc
  }

  return { afterChange: [afterChange], afterDelete: [afterDelete] }
}

const pending = new Set<Promise<void>>()

/**
 * Resolves once every notification the hooks have started has finished. For
 * tests: the hooks themselves don't wait for the Site's deployment.
 */
export async function revalidationSettled(): Promise<void> {
  while (pending.size > 0) await Promise.all(pending)
}

async function revalidate<TDoc>(
  req: PayloadRequest,
  collection: SanitizedCollectionConfig,
  tagsFor: TagsFor<TDoc>,
  operation: TagsForArgs<TDoc>["operation"],
  findChange: () => Promise<PublishedChange | null>
) {
  const { payload } = req
  try {
    const change = await findChange()
    if (!change) return
    const tags = uniqueTags(
      await tagsFor({
        doc: change.doc as TDoc,
        previousDoc: change.previousDoc as TDoc | undefined,
        collection: collection.slug as CollectionSlug,
        operation,
        payload,
        req,
      })
    )
    if (tags.length === 0) return
    const sites = owningSites(collection, change.doc, change.previousDoc)
    afterResponse(() =>
      sites === "all"
        ? notifyAllSites(payload, tags)
        : Promise.all(sites.map((site) => notify(payload, site, tags))).then(
            () => undefined
          )
    )
  } catch (error) {
    payload.logger.error(
      { err: error },
      `Revalidation failed for ${collection.slug}`
    )
  }
}

/**
 * The published before/after of a change, or null when the Site doesn't see
 * it (a draft save).
 */
async function publishedChange(
  req: PayloadRequest,
  collection: SanitizedCollectionConfig,
  operation: "create" | "update",
  doc: Doc,
  previousDoc: Doc | undefined
): Promise<PublishedChange | null> {
  if (!hasDrafts(collection)) {
    return {
      doc,
      previousDoc: operation === "create" ? undefined : previousDoc,
    }
  }
  if (operation === "create") {
    return isPublished(doc) ? { doc, previousDoc: undefined } : null
  }

  // A draft save only writes a version; publishing and unpublishing also
  // write the main document. (`previousDoc` is the latest version, which may
  // be a draft, so it can't tell these apart.)
  const main = await req.payload.db.findOne<Doc>({
    collection: collection.slug,
    where: { id: { equals: doc.id } },
    req,
  })
  if (!main || !sameInstant(main.updatedAt, doc.updatedAt)) return null

  const previousPublished = await lastPublishedVersion(req, collection, doc.id)
  if (isPublished(doc)) return { doc, previousDoc: previousPublished }
  // Unpublished: the Site loses the previous published version.
  return previousPublished ? { doc, previousDoc: previousPublished } : null
}

/** The published version before the one this save wrote, if any. */
async function lastPublishedVersion(
  req: PayloadRequest,
  collection: SanitizedCollectionConfig,
  id: Doc["id"]
): Promise<Doc | undefined> {
  const { docs } = await req.payload.db.findVersions<Doc>({
    collection: collection.slug,
    where: {
      and: [
        { parent: { equals: id } },
        { "version._status": { equals: "published" } },
        { latest: { not_equals: true } },
      ],
    },
    sort: "-updatedAt",
    limit: 1,
    pagination: false,
    req,
  })
  const version = docs[0]?.version
  return version ? { ...version, id } : undefined
}

/**
 * Runs `task` after the response: in a request (admin, REST) through Next's
 * `after`, so after the save's transaction commits and kept alive by the
 * platform (waitUntil). Outside a request (scripts, tests) it starts now;
 * scripts that write in a transaction should batch instead (`createBatch`).
 */
function afterResponse(task: () => Promise<void>) {
  const done = new Promise<void>((resolve) => {
    const start = () => task().then(resolve, resolve)
    try {
      after(start)
    } catch {
      void start()
    }
  })
  pending.add(done)
  void done.finally(() => pending.delete(done))
}

/** The Sites a change affects, or "all" for collections that aren't Site-scoped. */
function owningSites(
  collection: SanitizedCollectionConfig,
  doc: Doc,
  previousDoc: Doc | undefined
): SiteRef[] | "all" {
  if (collection.slug === "sites") return [doc.id as SiteRef]
  if (!collection.flattenedFields.some((field) => field.name === "site")) {
    return "all"
  }
  const ids = new Map<string, SiteRef>()
  for (const site of [doc.site, previousDoc?.site]) {
    const id = relationId(site)
    if (id !== undefined) ids.set(String(id), id)
  }
  return [...ids.values()]
}

/** The ID of a relationship value, populated or not. */
export function relationId(value: unknown): number | string | undefined {
  if (typeof value === "number" || typeof value === "string") return value
  if (value && typeof value === "object" && "id" in value) {
    return relationId((value as { id: unknown }).id)
  }
  return undefined
}

function hasDrafts(collection: SanitizedCollectionConfig): boolean {
  return Boolean(collection.versions && collection.versions.drafts)
}

function isPublished(doc: Doc): boolean {
  return doc._status === "published"
}

function sameInstant(a: unknown, b: unknown): boolean {
  const time = (value: unknown) =>
    typeof value === "string" || value instanceof Date
      ? new Date(value).getTime()
      : NaN
  return time(a) === time(b)
}
