import type { Payload } from "payload"

import type { Property, Site, Submission } from "@workspace/cms-types"

import { messageOf, send } from "./adapters"
import type { Destination, ForwardedSubmission, ForwardOutcome } from "./types"

type ID = number | string

/** Submissions being forwarded by this process, to avoid sending twice. */
const inFlight = new Set<string>()

/**
 * Forwards a stored Submission to its Site's Forwarding Destinations
 * (ADR-0014) and records the result on the Submission: `forwardingStatus`,
 * `forwardingAttempts`, `lastForwardingError` and `forwardedAt`.
 *
 * Idempotent: a Submission that is already `sent` (or is being forwarded
 * right now) is skipped. Never throws; failures are returned and recorded.
 * Writes with `overrideAccess`, so callers check access first.
 */
export async function forwardSubmission(
  payload: Payload,
  submissionId: ID
): Promise<ForwardOutcome> {
  const key = String(submissionId)
  if (inFlight.has(key)) return { status: "skipped", reason: "in-progress" }
  inFlight.add(key)
  try {
    return await forward(payload, submissionId)
  } catch (error) {
    payload.logger.error({ err: error, submissionId }, "Forwarding failed")
    return { status: "failed", error: messageOf(error) }
  } finally {
    inFlight.delete(key)
  }
}

async function forward(
  payload: Payload,
  submissionId: ID
): Promise<ForwardOutcome> {
  const submission = await payload
    .findByID({
      collection: "submissions",
      id: submissionId,
      depth: 1,
      overrideAccess: true,
      disableErrors: true,
    })
    .catch(() => null)
  if (!submission) return { status: "skipped", reason: "not-found" }
  if (submission.forwardingStatus === "sent") {
    return { status: "skipped", reason: "already-sent" }
  }

  const site =
    typeof submission.site === "object"
      ? submission.site
      : await payload.findByID({
          collection: "sites",
          id: submission.site,
          depth: 0,
          overrideAccess: true,
        })

  const destinations = destinationsFor(site, submission.kind)
  if (destinations.length === 0) {
    await record(payload, submission.id, {
      lastForwardingError: `No Forwarding Destination for ${submission.kind} on this Site`,
    })
    return { status: "skipped", reason: "no-destination" }
  }

  // Destinations that accepted on an earlier attempt aren't sent to again.
  const delivered = new Set(deliveredTo(submission))
  const pending = destinations.filter(
    (destination) => !destination.id || !delivered.has(destination.id)
  )
  const message = toForwarded(submission, site)
  const results = await Promise.allSettled(
    pending.map((destination) => send(payload, destination, message))
  )
  const errors: string[] = []
  results.forEach((result, i) => {
    const id = pending[i]?.id
    if (result.status === "rejected") errors.push(messageOf(result.reason))
    else if (id) delivered.add(id)
  })
  const attempts = (submission.forwardingAttempts ?? 0) + 1

  if (errors.length > 0) {
    const error = errors.join("; ")
    await record(payload, submission.id, {
      forwardingStatus: "failed",
      forwardingAttempts: attempts,
      lastForwardingError: error,
      deliveredTo: [...delivered],
    })
    return { status: "failed", error }
  }

  await record(payload, submission.id, {
    forwardingStatus: "sent",
    forwardingAttempts: attempts,
    lastForwardingError: null,
    forwardedAt: new Date().toISOString(),
    deliveredTo: [...delivered],
  })
  return { status: "sent", destinations: destinations.length }
}

/** The Site's destinations for this kind of Submission (or `all` kinds). */
function destinationsFor(site: Site, kind: Submission["kind"]): Destination[] {
  return (site.forwarding?.destinations ?? []).filter(
    (destination) => destination.kind === "all" || destination.kind === kind
  )
}

function deliveredTo(submission: Submission): string[] {
  const value = submission.deliveredTo
  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string")
    : []
}

function record(
  payload: Payload,
  id: ID,
  data: Partial<
    Pick<
      Submission,
      | "forwardingStatus"
      | "forwardingAttempts"
      | "lastForwardingError"
      | "forwardedAt"
      | "deliveredTo"
    >
  >
) {
  return payload.update({
    collection: "submissions",
    id,
    data,
    depth: 0,
    overrideAccess: true,
  })
}

function toForwarded(submission: Submission, site: Site): ForwardedSubmission {
  const property =
    submission.property && typeof submission.property === "object"
      ? (submission.property as Property)
      : null
  return {
    id: submission.id,
    kind: submission.kind,
    site: { id: site.id, slug: site.slug, name: site.name },
    name: submission.name,
    email: submission.email,
    phone: submission.phone ?? null,
    message: submission.message ?? null,
    property: property
      ? { id: property.id, feedId: property.feedId ?? null }
      : typeof submission.property === "number"
        ? { id: submission.property, feedId: null }
        : null,
    arrival: submission.arrival ?? null,
    departure: submission.departure ?? null,
    guests: submission.guests ?? null,
    sourceUrl: submission.sourceUrl ?? null,
    payload: submission.payload,
    createdAt: submission.createdAt,
  }
}
