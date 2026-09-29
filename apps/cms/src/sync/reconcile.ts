import { createLocalReq, type Payload, type PayloadRequest } from "payload"

import type { Site } from "@workspace/cms-types"
import type { CacheTag } from "@workspace/content/shared"

import {
  createBatch,
  tagPresets,
  type RevalidationBatch,
  type TagsFor,
} from "../revalidation"
import type { FeedListing, FeedNode, PropertyFeed } from "./feed"
import { mapListing, type ID } from "./mapListing"
import {
  mapAmenity,
  mapNode,
  mapPromo,
  mapPropertyType,
  mapReview,
} from "./mapRecords"
import {
  emptyCounts,
  openMirror,
  type Change,
  type Counts,
  type Mirror,
  type MirroredCollection,
  type MirrorDoc,
  type Outcome,
} from "./mirror"

export type SyncContext = {
  payload: Payload
  feed: PropertyFeed
  /** Threaded through every write, e.g. an endpoint's request. */
  req?: PayloadRequest
}

/** A Site by ID, or the Site document (with `feedAccountRef`). */
export type SiteRef = ID | string | Pick<Site, "id" | "slug" | "feedAccountRef">

export type SyncOutcome = Outcome

export type SyncError = {
  collection: MirroredCollection
  feedId: string
  message: string
}

export type ReconcileReport = {
  site: { id: ID; slug: string; feedAccountRef: string }
  /** Null when the vocabularies already had everything the listings use. */
  vocabularies: { amenities: Counts; propertyTypes: Counts } | null
  locations: Counts
  properties: Counts
  specials: Counts
  reviews: Counts
  /** Records that failed or had unresolved references. The rest still synced. */
  errors: SyncError[]
}

export type VocabularyReport = {
  amenities: Counts
  propertyTypes: Counts
  errors: SyncError[]
}

/** The Site can't be synced: it doesn't exist or has no Feed account. */
export class SyncSiteError extends Error {
  constructor(
    message: string,
    readonly reason: "not-found" | "no-feed-account"
  ) {
    super(message)
    this.name = "SyncSiteError"
  }
}

type SyncSite = { id: ID; slug: string; feedAccountRef: string }

/** Shared state of one Sync run. */
type Run = {
  ctx: SyncContext
  req: PayloadRequest
  batch: RevalidationBatch
  errors: SyncError[]
}

async function startRun(ctx: SyncContext): Promise<Run> {
  return {
    ctx,
    req: ctx.req ?? (await createLocalReq({}, ctx.payload)),
    batch: createBatch(ctx.payload),
    errors: [],
  }
}

function fail(run: Run, collection: MirroredCollection, feedId: string) {
  return (error: unknown) => {
    run.errors.push({
      collection,
      feedId,
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

/** Runs `write`, recording a failure instead of throwing. */
async function attempt(
  run: Run,
  collection: MirroredCollection,
  feedId: string,
  write: () => Promise<unknown>
): Promise<void> {
  try {
    await write()
  } catch (error) {
    fail(run, collection, feedId)(error)
  }
}

function unresolved(
  run: Run,
  collection: MirroredCollection,
  feedId: string,
  refs: string[]
) {
  if (refs.length > 0) {
    fail(run, collection, feedId)(`Unresolved: ${refs.join(", ")}`)
  }
}

/** Tags for one change, from the collection's preset (ADR-0009). */
async function tagsFor(
  run: Run,
  collection: MirroredCollection,
  { doc, previousDoc, outcome }: Change
): Promise<CacheTag[]> {
  const preset = tagPresets[collection] as unknown as TagsFor<MirrorDoc>
  return preset({
    doc,
    previousDoc,
    collection,
    operation: outcome === "created" ? "create" : "update",
    payload: run.ctx.payload,
    req: run.req,
  })
}

async function open(
  run: Run,
  collection: MirroredCollection,
  site: ID | null,
  onChange: (change: Change) => Promise<void>,
  feedIds?: string[]
): Promise<Mirror> {
  return openMirror({
    payload: run.ctx.payload,
    req: run.ctx.req,
    collection,
    site,
    feedIds,
    onChange,
    onError: (feedId, error) => fail(run, collection, feedId)(error),
  })
}

/** A Site-scoped mirror whose changes queue tags for that Site. */
function openForSite(
  run: Run,
  collection: MirroredCollection,
  site: SyncSite,
  feedIds?: string[]
): Promise<Mirror> {
  return open(
    run,
    collection,
    site.id,
    async (change) => {
      run.batch.add(site.id, await tagsFor(run, collection, change))
    },
    feedIds
  )
}

type Vocabularies = {
  amenities: Mirror
  propertyTypes: Mirror
  /** Tags every Site must revalidate because a vocabulary changed. */
  tags: CacheTag[]
}

async function openVocabularies(run: Run): Promise<Vocabularies> {
  const tags: CacheTag[] = []
  const collect =
    (collection: MirroredCollection) => async (change: Change) => {
      tags.push(...(await tagsFor(run, collection, change)))
    }
  return {
    amenities: await open(run, "amenities", null, collect("amenities")),
    propertyTypes: await open(
      run,
      "property-types",
      null,
      collect("property-types")
    ),
    tags,
  }
}

/** Mirrors the Feed's vocabularies onto the open mirrors. */
async function mirrorVocabularies(run: Run, vocab: Vocabularies) {
  const { amenities, propertyTypes } = await run.ctx.feed.listVocabularies()
  for (const amenity of amenities) {
    await attempt(run, "amenities", amenity.feedId, () =>
      vocab.amenities.upsert(mapAmenity(amenity))
    )
  }
  for (const type of propertyTypes) {
    await attempt(run, "property-types", type.feedId, () =>
      vocab.propertyTypes.upsert(mapPropertyType(type))
    )
  }
  await vocab.amenities.withdrawMissing()
  await vocab.propertyTypes.withdrawMissing()
}

/** Queues vocabulary tags for every Site (they are shared, ADR-0013). */
async function queueVocabularyTags(run: Run, vocab: Vocabularies) {
  if (vocab.tags.length === 0) return
  const { docs } = await run.ctx.payload.find({
    collection: "sites",
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { slug: true },
    req: run.ctx.req,
  })
  for (const site of docs) run.batch.add(site.id, vocab.tags)
}

/**
 * Mirrors the Awayday-wide Amenities and Property Types (not Site-scoped).
 * Dropped entries are Withdrawn, never deleted. A change notifies every Site.
 */
export async function syncVocabularies(
  ctx: SyncContext
): Promise<VocabularyReport> {
  const run = await startRun(ctx)
  try {
    const vocab = await openVocabularies(run)
    await mirrorVocabularies(run, vocab)
    await queueVocabularyTags(run, vocab)
    return {
      amenities: vocab.amenities.counts,
      propertyTypes: vocab.propertyTypes.counts,
      errors: run.errors,
    }
  } finally {
    await run.batch.flush()
  }
}

async function loadSite(ctx: SyncContext, ref: SiteRef): Promise<SyncSite> {
  const doc =
    typeof ref === "object"
      ? ref
      : await ctx.payload.findByID({
          collection: "sites",
          id: ref,
          depth: 0,
          overrideAccess: true,
          disableErrors: true,
          select: { slug: true, feedAccountRef: true },
          req: ctx.req,
        })
  if (!doc)
    throw new SyncSiteError(`Site ${String(ref)} not found`, "not-found")
  const account = doc.feedAccountRef?.trim()
  if (!account) {
    throw new SyncSiteError(
      `Site ${doc.slug} has no Property Feed account`,
      "no-feed-account"
    )
  }
  return { id: doc.id, slug: doc.slug, feedAccountRef: account }
}

/** Whether any listing uses a vocabulary entry the CMS doesn't have yet. */
function needsVocabularies(
  listings: FeedListing[],
  vocab: Vocabularies
): boolean {
  return listings.some(
    (listing) =>
      (listing.propertyTypeFeedId !== null &&
        vocab.propertyTypes.idOf(listing.propertyTypeFeedId) === undefined) ||
      listing.amenityFeedIds.some(
        (feedId) => vocab.amenities.idOf(feedId) === undefined
      )
  )
}

/** Mirrors the node tree, parents before children. */
async function mirrorNodes(run: Run, locations: Mirror, nodes: FeedNode[]) {
  const inFeed = new Set(nodes.map((node) => node.feedId))
  const processed = new Set<string>()
  let pending = nodes
  while (pending.length > 0) {
    const waiting: FeedNode[] = []
    for (const node of pending) {
      const parent = node.parentFeedId
      if (parent && inFeed.has(parent) && !processed.has(parent)) {
        waiting.push(node)
        continue
      }
      processed.add(node.feedId)
      const parentId = parent ? locations.idOf(parent) : null
      if (parentId === undefined) {
        locations.keep(node.feedId)
        fail(
          run,
          "locations",
          node.feedId
        )(`Parent node ${parent} not mirrored`)
        continue
      }
      await attempt(run, "locations", node.feedId, () =>
        locations.upsert(mapNode(node, parentId))
      )
    }
    if (waiting.length === pending.length) {
      for (const node of waiting) {
        locations.keep(node.feedId)
        fail(run, "locations", node.feedId)("Node is part of a parent cycle")
      }
      break
    }
    pending = waiting
  }
}

/**
 * A full Sync of one Site from its Feed account: vocabularies (when the
 * listings use entries the CMS lacks) → Locations (parents first) →
 * Properties → Specials → Reviews. Anything the Feed no longer lists is
 * Withdrawn, per Site. Writes skip per-document revalidation; the Site gets
 * one batched notification at the end (plus every Site, when a vocabulary
 * changed). Idempotent: a second run reports everything unchanged.
 *
 * Throws only when the Site can't be synced (`SyncSiteError`) or the Feed
 * can't be read; failures of single records are in `report.errors`.
 */
export async function reconcile(
  ctx: SyncContext,
  siteRef: SiteRef
): Promise<ReconcileReport> {
  const site = await loadSite(ctx, siteRef)
  const account = site.feedAccountRef
  const { feed } = ctx
  // Read everything first: a Feed failure aborts before any write.
  const [nodes, listings, promos, reviews] = await Promise.all([
    feed.listNodes(account),
    feed.listListings(account),
    feed.listPromos(account),
    feed.listReviews(account),
  ])

  const run = await startRun(ctx)
  try {
    const vocab = await openVocabularies(run)
    const vocabularies = needsVocabularies(listings, vocab)
      ? await mirrorVocabularies(run, vocab).then(() => ({
          amenities: vocab.amenities.counts,
          propertyTypes: vocab.propertyTypes.counts,
        }))
      : null
    await queueVocabularyTags(run, vocab)

    const locations = await openForSite(run, "locations", site)
    await mirrorNodes(run, locations, nodes)
    await locations.withdrawMissing()

    const properties = await openForSite(run, "properties", site)
    for (const listing of listings) {
      await attempt(run, "properties", listing.feedId, async () => {
        const { data, unresolved: refs } = mapListing(listing, {
          location: locations.idOf,
          propertyType: vocab.propertyTypes.idOf,
          amenity: vocab.amenities.idOf,
        })
        await properties.upsert(data)
        unresolved(run, "properties", listing.feedId, refs)
      })
    }
    await properties.withdrawMissing()

    const specials = await openForSite(run, "specials", site)
    for (const promo of promos) {
      await attempt(run, "specials", promo.feedId, async () => {
        const mapped = mapPromo(promo, properties.idOf)
        await specials.upsert(mapped.data, mapped.createData)
        unresolved(run, "specials", promo.feedId, mapped.unresolved)
      })
    }
    await specials.withdrawMissing()

    const reviewMirror = await openForSite(run, "reviews", site)
    for (const review of reviews) {
      const propertyId = properties.idOf(review.listingFeedId)
      if (propertyId === undefined) {
        reviewMirror.keep(review.feedId)
        fail(
          run,
          "reviews",
          review.feedId
        )(`Unresolved: listing ${review.listingFeedId}`)
        continue
      }
      await attempt(run, "reviews", review.feedId, () => {
        const mapped = mapReview(review, propertyId)
        return reviewMirror.upsert(mapped.data, mapped.createData)
      })
    }
    await reviewMirror.withdrawMissing()

    return {
      site,
      vocabularies,
      locations: locations.counts,
      properties: properties.counts,
      specials: specials.counts,
      reviews: reviewMirror.counts,
      errors: run.errors,
    }
  } finally {
    await run.batch.flush()
  }
}

/**
 * Syncs one listing's Property Facts (e.g. on a Feed change notification):
 * created, updated, Withdrawn when the Feed no longer has it, or unchanged.
 * Its Location, Property Type and Amenities must already be mirrored; refs
 * that aren't are left empty. Throws when the write fails.
 */
export async function syncListing(
  ctx: SyncContext,
  siteRef: SiteRef,
  feedId: string
): Promise<SyncOutcome> {
  const site = await loadSite(ctx, siteRef)
  const listing = await ctx.feed.getListing(site.feedAccountRef, feedId)
  const run = await startRun(ctx)
  try {
    const properties = await openForSite(run, "properties", site, [feedId])
    if (!listing) return await properties.withdraw(feedId)

    const noop = async () => {}
    const [locations, amenities, propertyTypes] = await Promise.all([
      open(run, "locations", site.id, noop),
      open(run, "amenities", null, noop),
      open(run, "property-types", null, noop),
    ])
    const { data } = mapListing(listing, {
      location: locations.idOf,
      propertyType: propertyTypes.idOf,
      amenity: amenities.idOf,
    })
    return await properties.upsert(data)
  } finally {
    await run.batch.flush()
  }
}

export { emptyCounts, type Counts }
