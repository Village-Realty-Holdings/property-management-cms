/**
 * Forwarding (docs/module-layout.md, "forwarding/"): a stored Submission →
 * its Site's Forwarding Destinations (ADR-0014).
 *
 * Interface: `forwardSubmission`, plus the Submissions collection's hook and
 * retry endpoint that call it. Hidden: choosing destinations by kind, the
 * webhook (signed JSON POST) and email adapters, idempotency, and recording
 * status and errors on the Submission.
 */
export { forwardSubmission } from "./forwardSubmission"
export { forwardOnCreate } from "./hooks"
export { retryForwardingEndpoint } from "./endpoint"
export { signBody } from "./adapters"
export type { ForwardOutcome, ForwardedSubmission } from "./types"
