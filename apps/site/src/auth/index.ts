/**
 * Staff sign-in (apps/site ADR-0003). The interface: the route handlers,
 * the config reader, the session strategy and hooks for Users, and the dev
 * sign-in guards.
 */
export {
  AFTER_SIGN_IN,
  DEV_PATH,
  readEntraConfig,
  SIGN_IN_PAGE,
  SIGN_OUT_PATH,
  START_PATH,
  type EntraConfig,
} from "./config"
export {
  assertNoDevSignInInProduction,
  DEV_STAFF_USER,
  devSignIn,
  devSignInEnabled,
} from "./devSignIn"
export type { SignInErrorCode } from "./oidc"
export {
  readSession,
  refreshSession,
  SESSION_COOKIE,
  SESSION_SECONDS,
  sessionStrategy,
} from "./session"
export { finishSignIn, startSignIn } from "./signIn"
export { signOut } from "./signOut"
