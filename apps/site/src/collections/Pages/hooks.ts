import type { CollectionBeforeChangeHook } from "payload"

/**
 * Records who saved the version. It is always set here, so nothing a client
 * sends for it is kept; a save with no User (a script) leaves it empty.
 */
export const recordUpdatedBy: CollectionBeforeChangeHook = ({ data, req }) => ({
  ...data,
  updatedBy: req.user?.collection === "users" ? req.user.id : null,
})
