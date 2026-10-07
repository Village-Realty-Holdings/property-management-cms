/**
 * User sign-in (apps/site ADR-0003, ADR-0015). The interface: the route
 * handlers, the config reader, the session strategy for Users, and the dev
 * sign-in guards.
 */
export {
  AFTER_SIGN_IN,
  DEV_PATH,
  HANDOFF_START_PATH,
  PASSWORD_PATH,
  readEntraConfig,
  SIGN_IN_PAGE,
  SIGN_OUT_PATH,
  SITE_USER_ROLE,
  CALLBACK_PATH,
  FINISH_PATH,
  type EntraConfig,
} from "./config"
export {
  assertNoDevSignInInProduction,
  DEV_USER,
  devSignIn,
  devSignInEnabled,
} from "./devSignIn"
export type { SignInErrorCode } from "./oidc"
export {
  readSession,
  SESSION_COOKIE,
  SESSION_SECONDS,
  sessionStrategy,
} from "./session"
export { finishHandoff, startHandoff } from "./handoff"
export { passwordSignIn } from "./password"
export { entraCallback, finishSignIn } from "./signIn"
export { registerThisSite, thisSiteSchema } from "./user"
export { signOut } from "./signOut"
