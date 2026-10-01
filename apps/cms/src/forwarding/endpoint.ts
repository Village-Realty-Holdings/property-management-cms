import type { Endpoint } from "payload"

import { forwardSubmission } from "./forwardSubmission"

/**
 * `POST /api/submissions/:id/forward`: the admin "Retry forwarding" action.
 * Staff Users who can update that Submission (staff of its Site) only;
 * everyone else gets 404, as if it didn't exist. Answers with the
 * ForwardOutcome.
 */
export const retryForwardingEndpoint: Endpoint = {
  path: "/:id/forward",
  method: "post",
  handler: async (req) => {
    const id = req.routeParams?.id
    if (!req.user || req.user.collection !== "users") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (typeof id !== "string" && typeof id !== "number") {
      return Response.json({ error: "Not found" }, { status: 404 })
    }
    // Checks read access (staffOfSite) as this user.
    const { totalDocs } = await req.payload.count({
      collection: "submissions",
      where: { id: { equals: id } },
      overrideAccess: false,
      user: req.user,
      req,
    })
    if (totalDocs === 0) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }
    const outcome = await forwardSubmission(req.payload, id)
    return Response.json(outcome, {
      status: outcome.status === "failed" ? 502 : 200,
    })
  },
}
