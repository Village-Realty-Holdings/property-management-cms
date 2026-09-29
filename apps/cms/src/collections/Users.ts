import type { ArrayField, CollectionConfig } from "payload"

import {
  getUserSiteIds,
  hasAccessToAllSites,
  protectStaffCredentials,
  staffAdminField,
  superAdminField,
  usersCreate,
  usersDelete,
  usersRead,
  usersUpdate,
} from "../access"
import { breakGlassOnly, capSessionAge, SESSION_SECONDS } from "../auth"

type Row = { site?: number | string | { id: number | string } | null }

const rowSiteId = (row: Row) =>
  row.site && typeof row.site === "object" ? row.site.id : row.site

const siteIds = (rows: unknown): Set<string> =>
  new Set(
    ((rows as Row[] | null | undefined) ?? []).map((row) =>
      String(rowSiteId(row))
    )
  )

/**
 * Site Assignment: the Sites a Staff User can access (ADR-0011). This is the
 * multi-tenant plugin's tenants array (`tenants[].site`), declared here so it
 * can carry our labels and rules (`tenantsArrayField.includeDefaultField: false`).
 */
const siteAssignment: ArrayField = {
  name: "tenants",
  label: "Site Assignment",
  labels: { singular: "Site", plural: "Sites" },
  type: "array",
  saveToJWT: true,
  access: {
    create: staffAdminField,
    update: staffAdminField,
  },
  admin: {
    description: "The Sites this Staff User can access.",
  },
  // Admins may only add or remove Sites on their own Site Assignment; rows
  // for other Sites must stay as they are.
  validate: (value, { req, previousValue }) => {
    if (!req.user || hasAccessToAllSites(req.user)) return true
    const allowed = new Set(getUserSiteIds(req).map(String))
    const next = siteIds(value)
    const previous = siteIds(previousValue)
    const changedElsewhere = [
      ...[...next].filter((id) => !previous.has(id)),
      ...[...previous].filter((id) => !next.has(id)),
    ].some((id) => !allowed.has(id))
    return changedElsewhere
      ? "You can only add or remove Sites on your own Site Assignment."
      : true
  },
  fields: [
    {
      name: "site",
      type: "relationship",
      relationTo: "sites",
      required: true,
      index: true,
      saveToJWT: true,
      // No filterOptions: Payload also enforces them on save, which would
      // reject rows for Sites outside the editing Admin's assignment. The
      // picker only lists Sites the Admin can read (sitesRead) anyway.
    },
  ],
}

/**
 * Staff Users (ADR-0011, ADR-0016). Staff sign in with Microsoft Entra ID
 * (src/auth: /auth/entra/start → /auth/entra/callback), which issues a normal
 * Payload session. The local (password) strategy stays on for the
 * break-glass Super Admin only (`breakGlassOnly`).
 */
export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "name", "role", "superAdmin"],
    group: "Settings",
  },
  auth: {
    // Short: removing `cms_user` in Entra only blocks the next sign-in.
    tokenExpiration: SESSION_SECONDS,
  },
  hooks: {
    beforeChange: [protectStaffCredentials],
    beforeLogin: [breakGlassOnly],
    beforeOperation: [capSessionAge],
  },
  access: {
    create: usersCreate,
    read: usersRead,
    update: usersUpdate,
    delete: usersDelete,
    unlock: usersUpdate,
  },
  fields: [
    {
      name: "name",
      type: "text",
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "editor",
      saveToJWT: true,
      options: [
        { label: "Admin", value: "admin" },
        { label: "Editor", value: "editor" },
      ],
      access: {
        create: staffAdminField,
        update: staffAdminField,
      },
      admin: { position: "sidebar" },
    },
    {
      name: "superAdmin",
      label: "Super Admin",
      type: "checkbox",
      defaultValue: false,
      saveToJWT: true,
      access: {
        create: superAdminField,
        update: superAdminField,
      },
      admin: {
        position: "sidebar",
        description: "Not limited by Site Assignment.",
      },
    },
    {
      name: "entraOid",
      label: "Entra object ID",
      type: "text",
      unique: true,
      index: true,
      access: {
        create: superAdminField,
        update: superAdminField,
      },
      admin: {
        position: "sidebar",
        readOnly: true,
        description: "Set on first Microsoft sign-in.",
      },
    },
    siteAssignment,
  ],
}
