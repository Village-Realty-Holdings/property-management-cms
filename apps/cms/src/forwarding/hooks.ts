import type { CollectionAfterChangeHook, Payload } from "payload"

import { forwardSubmission } from "./forwardSubmission"

type ID = number | string

/**
 * Delays between looking for a just-created Submission. The hook runs inside
 * the create's transaction, so the row is visible to the forwarding (which
 * runs outside it) only once that commits. A rolled-back create is never
 * found and never forwarded.
 */
const COMMIT_WAIT_MS = [0, 50, 200, 1_000, 3_000]

/**
 * `afterChange` hook on Submissions: forwards a new Submission in the
 * background, so the Site's form request doesn't wait for the destinations.
 * Errors are logged, never thrown into the create.
 *
 * Note: the promise outlives the request. On a serverless host that stops
 * work after the response, this needs `waitUntil` or a jobs queue instead.
 */
export const forwardOnCreate: CollectionAfterChangeHook = ({
  doc,
  operation,
  req,
}) => {
  if (operation !== "create") return doc
  const { payload } = req
  void forwardWhenCommitted(payload, doc.id as ID).catch((error: unknown) =>
    payload.logger.error(
      { err: error, submissionId: doc.id },
      "Forwarding failed"
    )
  )
  return doc
}

async function forwardWhenCommitted(payload: Payload, id: ID) {
  for (const delay of COMMIT_WAIT_MS) {
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
    const outcome = await forwardSubmission(payload, id)
    if (outcome.status !== "skipped" || outcome.reason !== "not-found") {
      return outcome
    }
  }
  payload.logger.warn(
    { submissionId: id },
    "Submission not found after create; not forwarded (retry from the admin)"
  )
  return undefined
}
