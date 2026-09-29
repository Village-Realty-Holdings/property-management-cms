import type { Endpoint } from "payload"

import { isSuperAdmin } from "../../access"
import {
  propertyFeedFromEnv,
  PropertyFeedUnavailableError,
  reconcile,
  SyncSiteError,
  UnknownFeedAccountError,
} from "../../sync"

/**
 * `POST /api/sites/:id/reconcile`: runs a full Sync of the Site from its
 * Property Feed account and answers with the ReconcileReport. Super Admins
 * only. Uses the demo feed when `PROPERTY_FEED=fake`; otherwise the HTTP
 * Feed, which answers 501 until the Feed's contract exists.
 */
const reconcileEndpoint: Endpoint = {
  path: "/:id/reconcile",
  method: "post",
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    if ((await isSuperAdmin({ req })) !== true) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    const id = req.routeParams?.id
    if (typeof id !== "string" && typeof id !== "number") {
      return Response.json({ error: "Not found" }, { status: 404 })
    }
    try {
      const report = await reconcile(
        { payload: req.payload, feed: propertyFeedFromEnv() },
        id
      )
      return Response.json(report)
    } catch (error) {
      if (error instanceof PropertyFeedUnavailableError) {
        return Response.json({ error: error.message }, { status: 501 })
      }
      if (error instanceof SyncSiteError && error.reason === "not-found") {
        return Response.json({ error: error.message }, { status: 404 })
      }
      if (
        error instanceof SyncSiteError ||
        error instanceof UnknownFeedAccountError
      ) {
        return Response.json({ error: error.message }, { status: 422 })
      }
      throw error
    }
  },
}

export const siteEndpoints: Endpoint[] = [reconcileEndpoint]
