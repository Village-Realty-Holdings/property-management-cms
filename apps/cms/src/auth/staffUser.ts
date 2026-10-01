import { randomBytes } from "node:crypto"

import type { Payload } from "payload"

import type { User } from "@workspace/cms-types"

import { CMS_USER_ROLE, SUPER_ADMIN_ROLE } from "./config"
import { SignInError, type EntraClaims } from "./oidc"

/**
 * Finds the Staff User for verified Entra claims, keyed by `entraOid`, and
 * creates one on first sign-in (role Editor, no Site Assignment). Entra app
 * roles are re-read every time: no `cms_user` means no sign-in, and
 * `cms_super_admin` sets the Super Admin flag (ADR-0016).
 *
 * An existing record with the same email but no `entraOid` is never linked
 * automatically (the email claim isn't a stable identifier); a Super Admin
 * resolves the conflict by setting its Entra object ID or deleting it.
 */
export async function upsertStaffUser(
  payload: Payload,
  claims: EntraClaims
): Promise<User> {
  const roles = Array.isArray(claims.roles) ? claims.roles : []
  if (!roles.includes(CMS_USER_ROLE)) {
    throw new SignInError(
      "not-allowed",
      `Entra user ${claims.oid} lacks the ${CMS_USER_ROLE} app role`
    )
  }
  const superAdmin = roles.includes(SUPER_ADMIN_ROLE)

  const email = (claims.email || claims.preferred_username || "")
    .trim()
    .toLowerCase()
  if (!email) {
    throw new SignInError("token", `Entra user ${claims.oid} has no email`)
  }
  const name = claims.name?.trim() || undefined

  const { docs } = await payload.find({
    collection: "users",
    where: { entraOid: { equals: claims.oid } },
    limit: 1,
    depth: 0,
  })
  const existing = docs[0]

  try {
    if (existing) {
      if (
        existing.superAdmin === superAdmin &&
        existing.email === email &&
        (name === undefined || existing.name === name)
      ) {
        return existing
      }
      return await payload.update({
        collection: "users",
        id: existing.id,
        data: { email, superAdmin, ...(name ? { name } : {}) },
        depth: 0,
      })
    }

    return await payload.create({
      collection: "users",
      data: {
        email,
        name,
        entraOid: claims.oid,
        role: "editor",
        superAdmin,
        // Staff accounts have no usable password: the local strategy is
        // required by Payload to create an auth user, and `breakGlassOnly`
        // rejects password login for anyone with an `entraOid`.
        password: randomBytes(32).toString("base64url"),
      },
      depth: 0,
    })
  } catch (error) {
    throw new SignInError(
      "account-conflict",
      `Could not save Staff User for Entra user ${claims.oid} (${email}): ${(error as Error).message}`
    )
  }
}
