import type { Payload } from "payload"

import type { User } from "../payload-types"
import {
  canUseSite,
  claimFirstSuperAdmin,
  registerSite,
  registryDb,
  RegistryError,
  userForEntra,
  type RegistrySite,
  type RegistryUser,
} from "../registry"
import type { EntraConfig } from "./config"
import { SignInError, type EntraClaims } from "./oidc"

/**
 * Who may sign in, and as which User (apps/site ADR-0015). Every way in
 * (Entra, password, a handoff from another Site, the dev sign-in) ends in
 * `signInAs`: the Registry User must be enabled and allowed on this Site,
 * and then gets this Site's own `users` record, which Pages and Layouts point
 * at as "updated by".
 */

/** This Site's Postgres schema, which is its identity in the Registry. */
export function thisSiteSchema(payload: Payload): string {
  return (payload.db as { schemaName?: string }).schemaName || "public"
}

/**
 * Registers this Site in the Registry with its current name and URL, and
 * returns its record. Signing in keeps the Registry's list of Sites (and the
 * Site switcher) up to date.
 */
export async function registerThisSite(
  payload: Payload
): Promise<RegistrySite> {
  const brand = await payload
    .findGlobal({ slug: "brand", depth: 0 })
    .catch(() => null)
  return registerSite(registryDb(payload), {
    schema: thisSiteSchema(payload),
    name: brand?.name,
    url: process.env.SITE_URL,
  })
}

/**
 * The Registry User for verified Entra claims. The required app role
 * (AUTH_REQUIRED_ROLE) is re-read every time: without it, Entra doesn't let
 * you in at all. Which Sites you may use is the Registry's to say.
 */
export async function registryUserForEntra(
  payload: Payload,
  claims: EntraClaims,
  { requiredRole, roleClaim }: Pick<EntraConfig, "requiredRole" | "roleClaim">
): Promise<RegistryUser> {
  const claimed = claims[roleClaim]
  const roles = Array.isArray(claimed) ? claimed : []
  if (!roles.includes(requiredRole)) {
    throw new SignInError(
      "not-allowed",
      `Entra user ${claims.oid} lacks the ${requiredRole} app role`
    )
  }
  const email = (claims.email || claims.preferred_username || "").trim()
  if (!email) {
    throw new SignInError("token", `Entra user ${claims.oid} has no email`)
  }
  try {
    return await userForEntra(registryDb(payload), {
      oid: claims.oid,
      email,
      name: claims.name,
    })
  } catch (error) {
    if (error instanceof RegistryError) {
      throw new SignInError("account-conflict", error.message)
    }
    throw error
  }
}

/**
 * Signs the Registry User in to this Site: refused unless they're enabled
 * and a Super Admin or have Site Access here. The first User to sign in while
 * the Registry has no Super Admin becomes one. Returns this Site's User.
 */
export async function signInAs(
  payload: Payload,
  registryUser: RegistryUser
): Promise<User> {
  await registerThisSite(payload)
  const db = registryDb(payload)
  if (!registryUser.disabled) await claimFirstSuperAdmin(db, registryUser)
  const allowed = await canUseSite(db, registryUser.id, thisSiteSchema(payload))
  if (!allowed) {
    throw new SignInError(
      "not-assigned",
      `${registryUser.email} has no access to ${thisSiteSchema(payload)}`
    )
  }
  return localUserFor(payload, registryUser)
}

/** This Site's User for the Registry User, created or updated to match. */
export async function localUserFor(
  payload: Payload,
  { id: registryUserId, email, name }: RegistryUser
): Promise<User> {
  const { docs } = await payload.find({
    collection: "users",
    where: { registryUserId: { equals: registryUserId } },
    limit: 1,
    depth: 0,
  })
  const existing = docs[0]
  try {
    if (existing) {
      if (existing.email === email && (existing.name ?? null) === name) {
        return existing
      }
      return await payload.update({
        collection: "users",
        id: existing.id,
        data: { email, name },
        depth: 0,
      })
    }
    return await payload.create({
      collection: "users",
      data: { email, name, registryUserId },
      depth: 0,
    })
  } catch (error) {
    throw new SignInError(
      "account-conflict",
      `Could not save this Site's User for ${email}: ${(error as Error).message}`
    )
  }
}
