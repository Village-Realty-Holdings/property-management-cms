import { AuthenticationError, type CollectionBeforeLoginHook } from "payload"

/**
 * `beforeLogin` hook on Users: password login is for the break-glass Super
 * Admin only (ADR-0016). Staff sign in with Microsoft; anyone with an Entra
 * object ID, or who isn't a Super Admin, is rejected with the same error as a
 * wrong password. Runs after Payload has checked the password.
 */
export const breakGlassOnly: CollectionBeforeLoginHook = ({ req, user }) => {
  const { entraOid, superAdmin } = user as {
    entraOid?: string | null
    superAdmin?: boolean | null
  }
  if (entraOid || superAdmin !== true) {
    req.payload.logger.warn(
      `Rejected password login for ${String(user.email)}: not the break-glass Super Admin`
    )
    throw new AuthenticationError(req.t)
  }
  return user
}
