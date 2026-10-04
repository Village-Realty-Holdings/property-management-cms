import type { Payload } from "payload"

import type { User } from "../payload-types"
import { SITE_USER_ROLE } from "./config"
import { SignInError, type EntraClaims } from "./oidc"

/**
 * Finds the User for verified Entra claims, keyed by `entraOid`, and
 * creates one on first sign-in. The app role is re-read every time: no
 * `site_user` means no sign-in (apps/site ADR-0003). Email and name follow
 * Entra.
 *
 * An existing record with the same email but another `entraOid` is never
 * linked automatically (the email claim isn't a stable identifier).
 */
export async function upsertUser(
  payload: Payload,
  claims: EntraClaims
): Promise<User> {
  const roles = Array.isArray(claims.roles) ? claims.roles : []
  if (!roles.includes(SITE_USER_ROLE)) {
    throw new SignInError(
      "not-allowed",
      `Entra user ${claims.oid} lacks the ${SITE_USER_ROLE} app role`
    )
  }
  const email = (claims.email || claims.preferred_username || "")
    .trim()
    .toLowerCase()
  if (!email) {
    throw new SignInError("token", `Entra user ${claims.oid} has no email`)
  }
  return findOrCreateUser(payload, {
    entraOid: claims.oid,
    email,
    name: claims.name?.trim() || undefined,
  })
}

type UserIdentity = { entraOid: string; email: string; name?: string }

/** Finds the User by `entraOid`, creating or updating it to match. */
export async function findOrCreateUser(
  payload: Payload,
  { entraOid, email, name }: UserIdentity
): Promise<User> {
  const { docs } = await payload.find({
    collection: "users",
    where: { entraOid: { equals: entraOid } },
    limit: 1,
    depth: 0,
  })
  const existing = docs[0]

  try {
    if (existing) {
      if (
        existing.email === email &&
        (name === undefined || existing.name === name)
      ) {
        return existing
      }
      return await payload.update({
        collection: "users",
        id: existing.id,
        data: { email, ...(name ? { name } : {}) },
        depth: 0,
      })
    }
    return await payload.create({
      collection: "users",
      data: { email, name, entraOid },
      depth: 0,
    })
  } catch (error) {
    throw new SignInError(
      "account-conflict",
      `Could not save User for Entra user ${entraOid} (${email}): ${(error as Error).message}`
    )
  }
}
