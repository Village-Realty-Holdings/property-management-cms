import "server-only"

import type { Payload } from "payload"

import { registerThisSite } from "../auth"
import {
  createUser,
  deleteUser,
  findUser,
  grantSite,
  listSites,
  listUsers,
  passwordProblem,
  registryDb,
  RegistryError,
  revokeSite,
  setPassword,
  sitesFor,
  updateUser,
  type ManagedUser,
  type RegistrySite,
} from "../registry"
import type { FormState } from "./formState"
import type { UserAccess } from "./theme/themeScreen"

/** One User in the Users list. */
export type UserRow = ManagedUser & {
  /** The signed-in User: never disabled, demoted or deleted by themselves. */
  isYou: boolean
}

export type UsersScreen = {
  /** Super Admins manage Users and Site Access; everyone else only sees. */
  canManage: boolean
  /** This Site in the Registry. */
  here: RegistrySite
  /** Every Site for a Super Admin, else this one. */
  sites: RegistrySite[]
  /** Every User for a Super Admin, else those who can use this Site. */
  rows: UserRow[]
}

/** The Users screen (apps/site ADR-0015), read from the Registry. */
export async function loadUsersScreen(
  payload: Payload,
  access: UserAccess
): Promise<UsersScreen> {
  const db = registryDb(payload)
  const here = await registerThisSite(payload)
  const me = await findUser(db, { id: access.user.registryUserId })
  const canManage = Boolean(me?.isSuperAdmin && !me.disabled)
  const all = await listUsers(db)
  const visible = canManage
    ? all
    : all.filter(
        (user) =>
          !user.disabled &&
          (user.isSuperAdmin || user.siteIds.includes(here.id))
      )
  return {
    canManage,
    here,
    sites: canManage ? await listSites(db) : [here],
    rows: visible.map((user) => ({
      ...user,
      isYou: user.id === access.user.registryUserId,
    })),
  }
}

/** The other Sites the signed-in User may switch to, with a URL to go to. */
export async function otherSitesFor(
  payload: Payload,
  access: UserAccess
): Promise<RegistrySite[]> {
  const db = registryDb(payload)
  const here = await registerThisSite(payload)
  return (await sitesFor(db, access.user.registryUserId)).filter(
    (site) => site.id !== here.id && site.url
  )
}

const NOT_ALLOWED: FormState = {
  ok: false,
  message: "Only a Super Admin can change Users and Site Access.",
}

async function isSuperAdmin(payload: Payload, access: UserAccess) {
  const me = await findUser(registryDb(payload), {
    id: access.user.registryUserId,
  })
  return Boolean(me?.isSuperAdmin && !me.disabled)
}

const field = (data: FormData, name: string) => {
  const value = data.get(name)
  return typeof value === "string" ? value.trim() : ""
}

/**
 * Adds a User (`id` null) or saves one: name, Super Admin, disabled, a new
 * password or none, and the Sites they have access to. You can't disable
 * yourself or take away your own Super Admin, so a Super Admin can't lock
 * everyone out by accident.
 */
export async function saveUserAs(
  payload: Payload,
  access: UserAccess,
  id: number | null,
  data: FormData
): Promise<FormState> {
  if (!(await isSuperAdmin(payload, access))) return NOT_ALLOWED
  const db = registryDb(payload)

  const name = field(data, "name")
  const password = data.get("password")
  const newPassword = typeof password === "string" ? password : ""
  const removePassword = data.get("removePassword") === "on"
  const superAdmin = data.get("superAdmin") === "on"
  const disabled = data.get("disabled") === "on"
  const known = new Set((await listSites(db)).map((site) => site.id))
  const siteIds = data
    .getAll("site")
    .map(Number)
    .filter((siteId) => known.has(siteId))

  if (newPassword) {
    const problem = passwordProblem(newPassword)
    if (problem) {
      return {
        ok: false,
        message: "Some fields need attention.",
        fieldErrors: { password: problem },
      }
    }
  }
  if (id === access.user.registryUserId && (disabled || !superAdmin)) {
    return {
      ok: false,
      message:
        "You can’t disable yourself or take away your own Super Admin. Ask another Super Admin.",
    }
  }

  try {
    const user =
      id === null
        ? await createUser(db, {
            email: field(data, "email"),
            name,
            password: newPassword || null,
            isSuperAdmin: superAdmin,
          })
        : await updateUser(db, id, { name, isSuperAdmin: superAdmin, disabled })
    if (id !== null && (newPassword || removePassword)) {
      await setPassword(db, user.id, newPassword || null)
    }
    const current = new Set(
      (await listUsers(db)).find((row) => row.id === user.id)?.siteIds ?? []
    )
    for (const siteId of siteIds) {
      if (!current.has(siteId)) await grantSite(db, user.id, siteId)
    }
    for (const siteId of current) {
      if (!siteIds.includes(siteId)) await revokeSite(db, user.id, siteId)
    }
    const label = user.name || user.email
    return {
      ok: true,
      message: id === null ? `Added ${label}.` : `Saved ${label}.`,
    }
  } catch (error) {
    if (error instanceof RegistryError) {
      return error.code === "not-found"
        ? { ok: false, message: error.message }
        : {
            ok: false,
            message: "Some fields need attention.",
            fieldErrors: { email: error.message },
          }
    }
    throw error
  }
}

/**
 * Deletes a User from the Registry: they can't sign in to any Site. Their
 * name stays on what they edited. You can't delete yourself.
 */
export async function deleteUserAs(
  payload: Payload,
  access: UserAccess,
  id: unknown
): Promise<FormState> {
  if (!(await isSuperAdmin(payload, access))) return NOT_ALLOWED
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "That User no longer exists." }
  }
  if (id === access.user.registryUserId) {
    return { ok: false, message: "You can’t delete yourself." }
  }
  const db = registryDb(payload)
  const user = await findUser(db, { id })
  if (!user) return { ok: false, message: "That User no longer exists." }
  await deleteUser(db, id)
  return { ok: true, message: `Deleted ${user.name || user.email}.` }
}
