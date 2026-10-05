import type pg from "pg"
import type { Payload } from "payload"

import { hashPassword, verifyNothing, verifyPassword } from "./password"

/**
 * The Registry (apps/site ADR-0015): the Users and Sites every deployment
 * shares, in the `registry` schema of the one database. A User signs in to
 * any Site with the same credentials, and may use a Site when they are a
 * Super Admin or have Site Access to it.
 *
 * Every Site reads and writes it through its own Payload's connection pool,
 * with plain SQL: Payload's collections live in the Site's schema, and the
 * Registry is outside all of them.
 */

export {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  passwordProblem,
} from "./password"
export { ensureRegistry, REGISTRY_DDL, REGISTRY_SCHEMA } from "./schema"

export type Db = Pick<pg.Pool, "query">

export type RegistryUser = {
  id: number
  email: string
  name: string | null
  entraOid: string | null
  hasPassword: boolean
  isSuperAdmin: boolean
  disabled: boolean
}

export type RegistrySite = {
  id: number
  /** The Site's Postgres schema (DATABASE_SCHEMA), which identifies it. */
  schema: string
  name: string | null
  /** The Site's origin (SITE_URL), without a trailing slash. */
  url: string | null
}

/** A Registry operation refused for a reason the person can act on. */
export class RegistryError extends Error {
  constructor(
    readonly code: "account-conflict" | "email-taken" | "not-found" | "invalid",
    message: string
  ) {
    super(message)
    this.name = "RegistryError"
  }
}

/** The Registry, through this Site's Payload connection pool. */
export function registryDb(payload: Payload): Db {
  return (payload.db as unknown as { pool: pg.Pool }).pool
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

const USER_COLUMNS = `id, email, name, entra_oid, password_hash IS NOT NULL AS has_password,
  is_super_admin, disabled_at IS NOT NULL AS disabled`

type UserRow = {
  id: number
  email: string
  name: string | null
  entra_oid: string | null
  has_password: boolean
  is_super_admin: boolean
  disabled: boolean
}

const toUser = (row: UserRow): RegistryUser => ({
  id: row.id,
  email: row.email,
  name: row.name,
  entraOid: row.entra_oid,
  hasPassword: row.has_password,
  isSuperAdmin: row.is_super_admin,
  disabled: row.disabled,
})

const SITE_COLUMNS = "id, schema, name, url"

// ---------------------------------------------------------------- Sites

/**
 * Registers this Site, or updates its name and URL. The schema identifies
 * it; a name or URL left out keeps what's there.
 */
export async function registerSite(
  db: Db,
  site: { schema: string; name?: string | null; url?: string | null }
): Promise<RegistrySite> {
  const url = site.url?.trim().replace(/\/+$/, "") || null
  const { rows } = await db.query<RegistrySite>(
    `INSERT INTO registry.sites (schema, name, url) VALUES ($1, $2, $3)
     ON CONFLICT (schema) DO UPDATE SET
       name = COALESCE(EXCLUDED.name, registry.sites.name),
       url = COALESCE(EXCLUDED.url, registry.sites.url),
       updated_at = CASE
         WHEN (EXCLUDED.name IS NOT NULL AND EXCLUDED.name IS DISTINCT FROM registry.sites.name)
           OR (EXCLUDED.url IS NOT NULL AND EXCLUDED.url IS DISTINCT FROM registry.sites.url)
         THEN now() ELSE registry.sites.updated_at END
     RETURNING ${SITE_COLUMNS}`,
    [site.schema, site.name?.trim() || null, url]
  )
  return rows[0]!
}

export async function listSites(db: Db): Promise<RegistrySite[]> {
  const { rows } = await db.query<RegistrySite>(
    `SELECT ${SITE_COLUMNS} FROM registry.sites ORDER BY COALESCE(name, schema), schema`
  )
  return rows
}

/** The Sites the User may use: every Site for a Super Admin. */
export async function sitesFor(
  db: Db,
  userId: number
): Promise<RegistrySite[]> {
  const { rows } = await db.query<RegistrySite>(
    `SELECT s.id, s.schema, s.name, s.url FROM registry.sites s
     JOIN registry.users u ON u.id = $1 AND u.disabled_at IS NULL
     WHERE u.is_super_admin
        OR EXISTS (SELECT 1 FROM registry.site_access a WHERE a.user_id = u.id AND a.site_id = s.id)
     ORDER BY COALESCE(s.name, s.schema), s.schema`,
    [userId]
  )
  return rows
}

// ---------------------------------------------------------------- Users

export async function findUser(
  db: Db,
  by: { id: number } | { email: string }
): Promise<RegistryUser | null> {
  const [column, value] =
    "id" in by ? ["id", by.id] : ["email", normalizeEmail(by.email)]
  const { rows } = await db.query<UserRow>(
    `SELECT ${USER_COLUMNS} FROM registry.users WHERE ${column} = $1`,
    [value]
  )
  return rows[0] ? toUser(rows[0]) : null
}

/**
 * Whether the User exists, isn't disabled, and may use the Site with this
 * schema: the check behind every sign-in and every signed-in request.
 */
export async function canUseSite(
  db: Db,
  userId: number,
  schema: string
): Promise<boolean> {
  const { rows } = await db.query(
    `SELECT 1 FROM registry.users u
     JOIN registry.sites s ON s.schema = $2
     WHERE u.id = $1 AND u.disabled_at IS NULL
       AND (u.is_super_admin OR EXISTS (
         SELECT 1 FROM registry.site_access a WHERE a.user_id = u.id AND a.site_id = s.id))`,
    [userId, schema]
  )
  return rows.length > 0
}

/**
 * The Registry User for verified Entra claims: found by `oid`; or a User
 * created with the same email and no Entra link yet, which is linked now
 * (a Super Admin added them by their work email); or a new User, who has no
 * Site Access until a Super Admin grants it. A User already linked to another
 * `oid` is never relinked.
 */
export async function userForEntra(
  db: Db,
  claims: { oid: string; email: string; name?: string }
): Promise<RegistryUser> {
  const email = normalizeEmail(claims.email)
  const name = claims.name?.trim() || null

  const byOid = await db
    .query<UserRow>(
      `UPDATE registry.users SET email = $2, name = COALESCE($3, name), updated_at = now()
     WHERE entra_oid = $1 RETURNING ${USER_COLUMNS}`,
      [claims.oid, email, name]
    )
    .catch(() => {
      throw new RegistryError(
        "account-conflict",
        `Another Registry User already uses ${email}`
      )
    })
  if (byOid.rows[0]) return toUser(byOid.rows[0])

  const linked = await db.query<UserRow>(
    `UPDATE registry.users SET entra_oid = $1, name = COALESCE(name, $3), updated_at = now()
     WHERE email = $2 AND entra_oid IS NULL RETURNING ${USER_COLUMNS}`,
    [claims.oid, email, name]
  )
  if (linked.rows[0]) return toUser(linked.rows[0])

  const created = await db.query<UserRow>(
    `INSERT INTO registry.users (email, name, entra_oid) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING RETURNING ${USER_COLUMNS}`,
    [email, name, claims.oid]
  )
  if (!created.rows[0]) {
    throw new RegistryError(
      "account-conflict",
      `${email} is linked to another Entra account`
    )
  }
  return toUser(created.rows[0])
}

/**
 * The User whose email and password these are, or null. It takes as long
 * whether or not the email has a password, and a disabled User gets null.
 */
export async function checkPassword(
  db: Db,
  email: string,
  password: string
): Promise<RegistryUser | null> {
  const { rows } = await db.query<UserRow & { password_hash: string | null }>(
    `SELECT ${USER_COLUMNS}, password_hash FROM registry.users WHERE email = $1`,
    [normalizeEmail(email)]
  )
  const row = rows[0]
  if (!row?.password_hash) return verifyNothing(password).then(() => null)
  if (!(await verifyPassword(password, row.password_hash))) return null
  return row.disabled ? null : toUser(row)
}

// ---------------------------------------------------------------- Managing

export type ManagedUser = RegistryUser & { siteIds: number[] }

/** Every User with the Sites they have access to, for Users & Sites. */
export async function listUsers(db: Db): Promise<ManagedUser[]> {
  const { rows } = await db.query<UserRow & { site_ids: number[] }>(
    `SELECT ${USER_COLUMNS},
       COALESCE(ARRAY(SELECT site_id FROM registry.site_access a
                      WHERE a.user_id = u.id ORDER BY site_id), '{}') AS site_ids
     FROM registry.users u ORDER BY COALESCE(name, email), email`
  )
  return rows.map((row) => ({ ...toUser(row), siteIds: row.site_ids }))
}

export async function createUser(
  db: Db,
  user: {
    email: string
    name?: string | null
    password?: string | null
    isSuperAdmin?: boolean
  }
): Promise<RegistryUser> {
  const email = normalizeEmail(user.email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RegistryError(
      "invalid",
      "Enter an email address like name@example.com."
    )
  }
  const hash = user.password ? await hashPassword(user.password) : null
  const { rows } = await db.query<UserRow>(
    `INSERT INTO registry.users (email, name, password_hash, is_super_admin)
     VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING ${USER_COLUMNS}`,
    [email, user.name?.trim() || null, hash, user.isSuperAdmin ?? false]
  )
  if (!rows[0]) {
    throw new RegistryError(
      "email-taken",
      `There is already a User with ${email}.`
    )
  }
  return toUser(rows[0])
}

export async function updateUser(
  db: Db,
  id: number,
  changes: { name?: string | null; isSuperAdmin?: boolean; disabled?: boolean }
): Promise<RegistryUser> {
  const { rows } = await db.query<UserRow>(
    `UPDATE registry.users SET
       name = CASE WHEN $2 THEN $3 ELSE name END,
       is_super_admin = COALESCE($4, is_super_admin),
       disabled_at = CASE
         WHEN $5::boolean IS NULL THEN disabled_at
         WHEN $5 THEN COALESCE(disabled_at, now())
         ELSE NULL END,
       updated_at = now()
     WHERE id = $1 RETURNING ${USER_COLUMNS}`,
    [
      id,
      "name" in changes,
      changes.name?.trim() || null,
      changes.isSuperAdmin ?? null,
      changes.disabled ?? null,
    ]
  )
  if (!rows[0])
    throw new RegistryError("not-found", "That User no longer exists.")
  return toUser(rows[0])
}

/** Sets the User's password, or removes it with null (Entra only). */
export async function setPassword(
  db: Db,
  id: number,
  password: string | null
): Promise<void> {
  const hash = password ? await hashPassword(password) : null
  const { rowCount } = await db.query(
    `UPDATE registry.users SET password_hash = $2, updated_at = now() WHERE id = $1`,
    [id, hash]
  )
  if (!rowCount)
    throw new RegistryError("not-found", "That User no longer exists.")
}

export async function deleteUser(db: Db, id: number): Promise<void> {
  await db.query(`DELETE FROM registry.users WHERE id = $1`, [id])
}

export async function grantSite(db: Db, userId: number, siteId: number) {
  await db.query(
    `INSERT INTO registry.site_access (user_id, site_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, siteId]
  )
}

export async function revokeSite(db: Db, userId: number, siteId: number) {
  await db.query(
    `DELETE FROM registry.site_access WHERE user_id = $1 AND site_id = $2`,
    [userId, siteId]
  )
}

// ---------------------------------------------------------------- Handoffs

/** How long a handoff to another Site can be used. */
export const HANDOFF_SECONDS = 60

/**
 * A single-use token that signs the User in to another Site, for the Site
 * switcher. Only its hash is stored, and only that Site can redeem it.
 */
export async function createHandoff(
  db: Db,
  userId: number,
  siteId: number
): Promise<string> {
  const token = Buffer.from(
    crypto.getRandomValues(new Uint8Array(32))
  ).toString("base64url")
  await db.query(`DELETE FROM registry.handoffs WHERE expires_at < now()`)
  await db.query(
    `INSERT INTO registry.handoffs (token_hash, user_id, site_id, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(secs => $4))`,
    [await sha256(token), userId, siteId, HANDOFF_SECONDS]
  )
  return token
}

/** Redeems a handoff for this Site: the User's id, or null. Never twice. */
export async function redeemHandoff(
  db: Db,
  token: string,
  siteId: number
): Promise<number | null> {
  const { rows } = await db.query<{ user_id: number }>(
    `DELETE FROM registry.handoffs
     WHERE token_hash = $1 AND site_id = $2 AND expires_at >= now()
     RETURNING user_id`,
    [await sha256(token), siteId]
  )
  return rows[0]?.user_id ?? null
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  )
  return Buffer.from(digest).toString("hex")
}
