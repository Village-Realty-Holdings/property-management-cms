import type {
  Access,
  CollectionBeforeChangeHook,
  FieldAccess,
  PayloadRequest,
  Where,
} from "payload"
import { Forbidden } from "payload"

import type { SiteReader, User } from "@workspace/cms-types"

/**
 * The ONLY place access rules are defined (docs/module-layout.md, "access/").
 * Collections compose these exports and never write inline access functions.
 *
 * Callers:
 * - Staff Users (`users`): Super Admins see everything. Admins and Editors
 *   see only documents on their Site Assignment (`tenants[].site`).
 * - SiteReaders (`site-readers`): used by one Site's deployment over REST
 *   with an API key. They read their own Site's published content only, and
 *   write nothing but Submissions. Drafts are previewed in the CMS
 *   (ADR-0018).
 * - Anonymous requests: nothing, anywhere.
 *
 * Every rule returns a `Where` constrained to the caller's Sites, never a
 * bare `true`, except for Super Admins. The multi-tenant plugin adds the same
 * Site constraint for Staff Users on Site-scoped collections; these rules are
 * the guarantee for SiteReaders and for the API (ADR-0010, ADR-0011).
 *
 * Note: Payload treats any truthy `create` result as "allowed" (a `Where`
 * cannot filter a document that doesn't exist yet), so on create the rules
 * also reject `data.site` outside the caller's Sites.
 */

type ID = number | string
type Ref = ID | { id: ID } | null | undefined

type StaffUser = User & { collection: "users" }
type ReaderUser = SiteReader & { collection: "site-readers" }

const idOf = (ref: Ref): ID | undefined =>
  ref && typeof ref === "object" ? ref.id : (ref ?? undefined)

function staffOf(req: PayloadRequest): StaffUser | null {
  const user = req.user as { collection?: string } | null | undefined
  return user?.collection === "users" ? (user as StaffUser) : null
}

function readerOf(req: PayloadRequest): ReaderUser | null {
  const user = req.user as { collection?: string } | null | undefined
  return user?.collection === "site-readers" ? (user as ReaderUser) : null
}

function staffSiteIds(user: StaffUser): ID[] {
  return (user.tenants ?? [])
    .map((row) => idOf(row.site))
    .filter((id): id is ID => id !== undefined)
}

/** Whether the request comes from a SiteReader (a Site deployment's key). */
export function isSiteReader(req: PayloadRequest): boolean {
  return readerOf(req) !== null
}

/**
 * The Sites the caller is limited to: a Staff User's Site Assignment, or a
 * SiteReader's one Site. Empty for anonymous requests. A Super Admin gets
 * their Site Assignment too; check `isSuperAdmin` for "all Sites".
 */
export function getUserSiteIds(req: PayloadRequest): ID[] {
  const staff = staffOf(req)
  if (staff) return staffSiteIds(staff)
  const site = idOf(readerOf(req)?.site)
  return site === undefined ? [] : [site]
}

/**
 * Whether a user is not limited by Site Assignment. Used by the multi-tenant
 * plugin's `userHasAccessToAllTenants`.
 */
export function hasAccessToAllSites(user: unknown): boolean {
  return (
    typeof user === "object" &&
    user !== null &&
    (user as { collection?: string }).collection !== "site-readers" &&
    (user as { superAdmin?: boolean | null }).superAdmin === true
  )
}

const isSuperAdminReq = (req: PayloadRequest): boolean =>
  Boolean(staffOf(req)?.superAdmin)

const isAdminRole = (user: StaffUser): boolean => user.role === "admin"

/** `data.site` on a write, when present, must be one of `ids`. */
function writesOutside(data: unknown, ids: ID[]): boolean {
  if (!data || typeof data !== "object" || !("site" in data)) return false
  const site = idOf((data as { site?: Ref }).site)
  if (site === undefined) return false
  return !ids.some((id) => String(id) === String(site))
}

function inSites(field: string, ids: ID[]): Where | false {
  return ids.length > 0 ? { [field]: { in: ids } } : false
}

/** Staff limited to their assigned Sites, optionally Admins only. */
function staffScoped({
  adminsOnly,
  field,
}: {
  adminsOnly: boolean
  field: string
}): Access {
  return ({ req, data }) => {
    const staff = staffOf(req)
    if (!staff) return false
    if (staff.superAdmin) return true
    if (adminsOnly ? !isAdminRole(staff) : !staff.role) return false
    const ids = staffSiteIds(staff)
    if (writesOutside(data, ids)) return false
    return inSites(field, ids)
  }
}

/**
 * SiteReader sees its own Site's documents matching `where`; staff via
 * staffOfSite. `where` receives the reader and may return undefined for no
 * further constraint.
 */
function forReader(where?: (reader: ReaderUser) => Where | undefined): Access {
  return (args) => {
    const reader = readerOf(args.req)
    if (!reader) return staffOfSite(args)
    const site = idOf(reader.site)
    if (site === undefined) return false
    const own: Where = { site: { equals: site } }
    const extra = where?.(reader)
    return extra ? { and: [own, extra] } : own
  }
}

// ---------------------------------------------------------------------------
// Collection access
// ---------------------------------------------------------------------------

/** Staff User with the Super Admin flag. Boolean, not Site-scoped. */
export const isSuperAdmin: Access = ({ req }) => isSuperAdminReq(req)

/** Admin, limited to documents whose `site` is on their Site Assignment. */
export const adminOfSite: Access = staffScoped({
  adminsOnly: true,
  field: "site",
})

/** Admin or Editor, limited to documents whose `site` is on their Site Assignment. */
export const staffOfSite: Access = staffScoped({
  adminsOnly: false,
  field: "site",
})

/**
 * `readVersions` for drafts-enabled collections: staffOfSite on the versions
 * table (`version.site`). SiteReaders never read versions.
 */
export const staffVersionsOfSite: Access = staffScoped({
  adminsOnly: false,
  field: "version.site",
})

// ---------------------------------------------------------------------------
// What a Site shows
// ---------------------------------------------------------------------------

const published = (): Where => ({ _status: { equals: "published" } })
const active = (): Where => ({ status: { equals: "active" } })
const visible = (): Where => ({
  and: [{ status: { equals: "active" } }, { visible: { equals: true } }],
})
const shown = (): Where => ({
  and: [{ moderation: { equals: "shown" } }, { status: { equals: "active" } }],
})
const onSite = (): Where => ({
  and: [
    { showOnSite: { equals: true } },
    { status: { equals: "active" } },
    {
      or: [
        { validTo: { exists: false } },
        { validTo: { greater_than_equal: new Date().toISOString() } },
      ],
    },
  ],
})

const shows: Record<string, () => Where> = {
  pages: published,
  guides: published,
  "curated-lists": published,
  properties: active,
  locations: visible,
  reviews: shown,
  specials: onSite,
}

/**
 * What a Site shows of `collection`, on top of "its own Site": the
 * conditions a SiteReader reads under, and what a Staff User's Preview
 * applies to read the Site as its deployment would (preview/). Undefined
 * when the Site shows every document (Media, Submissions it stores).
 */
export function siteShows(collection: string): Where | undefined {
  return shows[collection]?.()
}

// ---------------------------------------------------------------------------
// Reader access
// ---------------------------------------------------------------------------

/**
 * SiteReader: `_status = published` on its Site. Drafts are previewed in the
 * CMS by Staff Users (ADR-0018). Staff: staffOfSite.
 */
export const publishedForReader: Access = forReader(published)

/** SiteReader: Property `status = active` on its Site. Staff: staffOfSite. */
export const activeForReader: Access = forReader(active)

/** SiteReader: Location `status = active` and `visible` on its Site. Staff: staffOfSite. */
export const visibleForReader: Access = forReader(visible)

/**
 * SiteReader: Review with Moderation `shown` and `status = active` on its
 * Site. Staff: staffOfSite.
 */
export const shownForReader: Access = forReader(shown)

/**
 * SiteReader: Special with `showOnSite` and `status = active` that hasn't
 * expired, on its Site. Staff: staffOfSite.
 */
export const onSiteForReader: Access = forReader(onSite)

/** SiteReader: any document on its Site (e.g. Media). Staff: staffOfSite. */
export const siteForReader: Access = forReader()

/**
 * A SiteReader may create documents for its own Site (Submissions); Staff
 * Users (Super Admins too) create nothing. The collection must also use
 * `setReaderSite` so `site` is always the reader's.
 */
export const readerCreate: Access = ({ req }) => {
  const reader = readerOf(req)
  if (!reader) return false
  const site = idOf(reader.site)
  return site === undefined ? false : { site: { equals: site } }
}

/** Anyone authenticated, Staff User or SiteReader (shared vocabularies, ADR-0013). */
export const vocabularyRead: Access = ({ req }) => Boolean(req.user)

/** Denied through the API. The Sync writes with `overrideAccess: true` (ADR-0001). */
export const syncOnly: Access = () => false

// ---------------------------------------------------------------------------
// Sites (the tenant collection: the Site is the document's own `id`)
// ---------------------------------------------------------------------------

/** Staff: their assigned Sites. SiteReader: its own Site (for Site Settings). */
export const sitesRead: Access = ({ req }) => {
  if (isSuperAdminReq(req)) return true
  return inSites("id", getUserSiteIds(req))
}

/** Admins of that Site. */
export const sitesUpdate: Access = staffScoped({
  adminsOnly: true,
  field: "id",
})

// ---------------------------------------------------------------------------
// Users (Staff Users; Site Assignment is `tenants[].site`)
// ---------------------------------------------------------------------------

const self = (user: StaffUser): Where => ({ id: { equals: user.id } })

/** Admins may manage Staff Users on their Sites, but never Super Admins. */
function managedUsers(user: StaffUser): Where | false {
  const sites = inSites("tenants.site", staffSiteIds(user))
  // Not `not_equals: true`, which would skip NULLs in SQL.
  const notSuperAdmin: Where = {
    or: [{ superAdmin: { equals: false } }, { superAdmin: { exists: false } }],
  }
  return sites ? { and: [sites, notSuperAdmin] } : false
}

/** Staff: themselves and Staff Users sharing one of their Sites. */
export const usersRead: Access = ({ req }) => {
  const staff = staffOf(req)
  if (!staff) return false
  if (staff.superAdmin) return true
  const sites = inSites("tenants.site", staffSiteIds(staff))
  return sites ? { or: [self(staff), sites] } : self(staff)
}

/** Admins create Staff Users on their Sites. */
export const usersCreate: Access = ({ req }) => {
  const staff = staffOf(req)
  if (!staff) return false
  if (staff.superAdmin) return true
  if (!isAdminRole(staff)) return false
  return inSites("tenants.site", staffSiteIds(staff))
}

/** Everyone updates themselves; Admins also the Staff Users on their Sites. */
export const usersUpdate: Access = ({ req }) => {
  const staff = staffOf(req)
  if (!staff) return false
  if (staff.superAdmin) return true
  const managed = isAdminRole(staff) && managedUsers(staff)
  return managed ? { or: [self(staff), managed] } : self(staff)
}

/** Admins delete Staff Users on their Sites (not Super Admins). */
export const usersDelete: Access = ({ req }) => {
  const staff = staffOf(req)
  if (!staff) return false
  if (staff.superAdmin) return true
  return isAdminRole(staff) ? managedUsers(staff) : false
}

// ---------------------------------------------------------------------------
// Field access (boolean only; Payload field access can't return a Where)
// ---------------------------------------------------------------------------

/** Property Facts and other Feed-owned fields: update denied (the Sync uses overrideAccess). */
export const factsReadOnly: FieldAccess = () => false

/** Set only by hooks or `overrideAccess` writes, never through the API. */
export const lockedField: FieldAccess = () => false

/** Only Super Admins may set it (e.g. Users.superAdmin). */
export const superAdminField: FieldAccess = ({ req }) => isSuperAdminReq(req)

/** Super Admins and Admins (e.g. Users.role and the Site Assignment). */
export const staffAdminField: FieldAccess = ({ req }) => {
  const staff = staffOf(req)
  return Boolean(staff && (staff.superAdmin || isAdminRole(staff)))
}

/** Staff Users only; SiteReaders can't write it (e.g. Submissions.forwardingStatus). */
export const staffField: FieldAccess = ({ req }) => staffOf(req) !== null

/**
 * Site secrets (Sites.revalidationSecret): Super Admins and Admins of that
 * Site. Hidden from Editors and SiteReaders.
 */
export const siteSecretField: FieldAccess = ({ req, doc }) => {
  const staff = staffOf(req)
  if (!staff) return false
  if (staff.superAdmin) return true
  if (!isAdminRole(staff)) return false
  const siteId = idOf((doc as { id?: ID } | undefined)?.id)
  // On create there is no doc yet; only Super Admins create Sites.
  if (siteId === undefined) return false
  return staffSiteIds(staff).some((id) => String(id) === String(siteId))
}

// ---------------------------------------------------------------------------
// Hooks that belong to the access rules
// ---------------------------------------------------------------------------

/**
 * `beforeChange` hook on Users: only Super Admins change another Staff User's
 * email or password. An Admin shares Staff Users with other Sites' Admins, so
 * taking over a shared account would cross Sites.
 */
export const protectStaffCredentials: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const staff = staffOf(req)
  if (operation !== "update" || !staff || staff.superAdmin) return data
  if (String(originalDoc?.id) === String(staff.id)) return data
  const changesPassword = Boolean(data?.password)
  const changesEmail =
    typeof data?.email === "string" && data.email !== originalDoc?.email
  if (changesPassword || changesEmail) throw new Forbidden(req.t)
  return data
}

/**
 * `beforeChange` hook for collections SiteReaders create (Submissions): the
 * document's `site` is always the reader's own Site, whatever was sent.
 */
export const setReaderSite: CollectionBeforeChangeHook = ({
  data,
  operation,
  req,
}) => {
  const site = idOf(readerOf(req)?.site)
  if (operation === "create" && site !== undefined) {
    return { ...data, site }
  }
  return data
}
