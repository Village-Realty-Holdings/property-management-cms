import type {
  CollectionSlug,
  DataFromCollectionSlug,
  Payload,
  RequiredDataFromCollectionSlug,
  Where,
} from "payload"

/**
 * Options for every seed write: trusted (access bypassed), no population,
 * and no revalidation requests to Site deployments that may not be running.
 */
export const seedWrite = {
  overrideAccess: true,
  depth: 0,
  context: { skipRevalidation: true },
} as const

export type Upserted<S extends CollectionSlug> = {
  doc: DataFromCollectionSlug<S>
  created: boolean
}

/**
 * Creates the document matching `where` (its natural key), or updates it
 * with `data` when it already exists. Idempotent.
 */
export async function upsert<S extends CollectionSlug>(
  payload: Payload,
  collection: S,
  where: Where,
  data: RequiredDataFromCollectionSlug<S>
): Promise<Upserted<S>> {
  const existing = await findOne(payload, collection, where)
  if (existing) {
    const doc = await payload.update({
      collection,
      id: existing.id,
      data: data as never,
      ...seedWrite,
    })
    return { doc: doc as DataFromCollectionSlug<S>, created: false }
  }
  const doc = await payload.create({
    collection,
    data: data as never,
    ...seedWrite,
  })
  return { doc: doc as DataFromCollectionSlug<S>, created: true }
}

export async function findOne<S extends CollectionSlug>(
  payload: Payload,
  collection: S,
  where: Where
): Promise<DataFromCollectionSlug<S> | undefined> {
  const { docs } = await payload.find({
    collection,
    where,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    depth: 0,
  })
  return docs[0] as DataFromCollectionSlug<S> | undefined
}
