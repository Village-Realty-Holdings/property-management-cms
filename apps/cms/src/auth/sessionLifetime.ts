import { Forbidden, type CollectionBeforeOperationHook } from "payload"

/** Session lifetime for Staff Users (ADR-0016: kept short). */
export const SESSION_SECONDS = 8 * 60 * 60

/**
 * `beforeOperation` hook on Users: no token refresh once a session is
 * SESSION_SECONDS old, so a session ends within 2 × SESSION_SECONDS of
 * sign-in (a late refresh still issues a full-length token). Without it the
 * admin's automatic refresh would keep an active session alive forever, and
 * removing someone's `cms_user` role in Entra would never take effect.
 */
export const capSessionAge: CollectionBeforeOperationHook = ({
  args,
  operation,
  req,
}) => {
  if (operation !== "refresh" || !req.user) return args
  const { _sid: sid, sessions } = req.user as {
    _sid?: string
    sessions?: { id: string; createdAt?: string | Date | null }[] | null
  }
  const createdAt = sessions?.find((session) => session.id === sid)?.createdAt
  const started = createdAt ? new Date(createdAt).getTime() : Number.NaN
  if (!(Date.now() - started < SESSION_SECONDS * 1000)) {
    throw new Forbidden(req.t)
  }
  return args
}
