import type { Payload, PayloadRequest } from "payload"

import type { Location } from "@workspace/cms-types"

type ID = Location["id"]
type Ref = ID | { id: ID } | null | undefined

type TreeOptions = {
  /** Thread the caller's request (transaction) through the lookups. */
  req?: PayloadRequest
  /**
   * Defaults to `true`: these are server-side tree walks. Pass `false` with a
   * `req` carrying a user to apply that user's read access.
   */
  overrideAccess?: boolean
}

/** Upper bound on tree depth and walk size; the Feed's trees are shallow. */
const MAX_NODES = 10_000

/** The id of a relationship value, populated or not. */
export function refId(ref: Ref): ID | undefined {
  return ref && typeof ref === "object" ? ref.id : (ref ?? undefined)
}

/**
 * The Location and its ancestors, root first and the Location itself last,
 * e.g. [Florida, Destin, Long Beach Resort]. Empty when the Location doesn't
 * exist (or isn't readable). A `parent` cycle or a missing parent ends the
 * path instead of looping.
 */
export async function getLocationPath(
  payload: Payload,
  locationId: ID,
  { req, overrideAccess = true }: TreeOptions = {}
): Promise<Location[]> {
  const path: Location[] = []
  const seen = new Set<ID>()
  let next: ID | undefined = locationId

  while (next !== undefined && !seen.has(next) && seen.size < MAX_NODES) {
    seen.add(next)
    const doc: Location | null = await payload.findByID({
      collection: "locations",
      id: next,
      depth: 0,
      disableErrors: true,
      overrideAccess,
      req,
    })
    if (!doc) break
    path.push(doc)
    next = refId(doc.parent)
  }

  return path.reverse()
}

/**
 * Ids of every Location below `locationId` (children, grandchildren, …), not
 * including the Location itself. Breadth-first, one query per tree level.
 * Cycle-safe: each Location is visited once.
 */
export async function getDescendantIds(
  payload: Payload,
  locationId: ID,
  { req, overrideAccess = true }: TreeOptions = {}
): Promise<ID[]> {
  const seen = new Set<ID>([locationId])
  const descendants: ID[] = []
  let frontier: ID[] = [locationId]

  while (frontier.length > 0 && seen.size < MAX_NODES) {
    const { docs } = await payload.find({
      collection: "locations",
      where: { parent: { in: frontier } },
      depth: 0,
      pagination: false,
      select: { parent: true },
      overrideAccess,
      req,
    })
    frontier = []
    for (const { id } of docs) {
      if (seen.has(id)) continue
      seen.add(id)
      descendants.push(id)
      frontier.push(id)
    }
  }

  return descendants
}
