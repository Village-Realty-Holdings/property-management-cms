/**
 * Entra sign-in for Staff Users (ADR-0016). The interface: the two route
 * handlers, the config reader, and the Users hooks that keep password login
 * for the break-glass Super Admin only and bound session length.
 */
export { breakGlassOnly } from "./breakGlassOnly"
export { readEntraConfig, type EntraConfig } from "./config"
export { capSessionAge, SESSION_SECONDS } from "./sessionLifetime"
export { finishSignIn, startSignIn } from "./signIn"
