import type { Access, FieldAccess } from "payload"

/**
 * The only place access rules are defined (apps/site ADR-0003): a signed-in
 * Staff User can do everything, and visitors read only what's Published.
 */

/** A signed-in Staff User. */
export const signedIn: Access = ({ req }) => Boolean(req.user)

/** Anyone, signed in or not. */
export const anyone: Access = () => true

/** Nobody through the API. Server code uses the Local API's default override. */
export const nobody: Access = () => false

/** Staff Users read everything; visitors read Published documents only. */
export const publishedOrSignedIn: Access = ({ req }) =>
  req.user ? true : { _status: { equals: "published" } }

/** Field-level: a field nobody changes through the API. */
export const readOnlyField: FieldAccess = () => false
