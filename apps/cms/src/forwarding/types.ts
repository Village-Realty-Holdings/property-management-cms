import type { Site, Submission } from "@workspace/cms-types"

type Destinations = NonNullable<NonNullable<Site["forwarding"]>["destinations"]>

/** One of a Site's Forwarding Destinations (`site.forwarding.destinations[]`). */
export type Destination = Destinations[number]

/**
 * What forwardSubmission did:
 * - `sent`: every matching destination accepted the Submission.
 * - `failed`: at least one destination failed; the Submission is `failed`
 *   with `lastForwardingError`, and can be retried.
 * - `skipped`: nothing was sent, because the Submission was already sent,
 *   is being forwarded right now, has no matching destination (it stays
 *   `pending`), or doesn't exist.
 */
export type ForwardOutcome =
  | { status: "sent"; destinations: number }
  | { status: "failed"; error: string }
  | {
      status: "skipped"
      reason: "already-sent" | "in-progress" | "no-destination" | "not-found"
    }

/**
 * The JSON body POSTed to webhook destinations (and the basis of the email).
 * Its shape is the contract with CRMs; change it additively.
 */
export type ForwardedSubmission = {
  id: Submission["id"]
  kind: Submission["kind"]
  site: { id: Site["id"]; slug: string; name: string }
  name: string
  email: string
  phone: string | null
  message: string | null
  property: { id: number; feedId: string | null } | null
  arrival: string | null
  departure: string | null
  guests: number | null
  sourceUrl: string | null
  payload: Submission["payload"]
  createdAt: string
}
