import type { FieldAccess } from "payload"

import { siteSecretField, staffAdminField, superAdminField } from "../../access"

type WriteAccess = { create: FieldAccess; update: FieldAccess }

/**
 * Site Settings: everyone who can read the Site (Editors, SiteReaders) reads
 * them; only Admins write them. `Sites.update` (sitesUpdate) already limits
 * writes to Admins of that Site; this field rule keeps every tab consistent.
 */
export const adminsOnly: WriteAccess = {
  create: staffAdminField,
  update: staffAdminField,
}

/** The Site's key (`slug`): renaming it breaks the deployment's SITE env var. */
export const superAdminsOnly: WriteAccess = {
  create: superAdminField,
  update: superAdminField,
}

/** Secrets: Admins of that Site and Super Admins; hidden from everyone else. */
export const secretAccess = {
  read: siteSecretField,
  create: siteSecretField,
  update: siteSecretField,
}
