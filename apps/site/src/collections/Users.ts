import type { CollectionConfig } from "payload"

import { nobody, readOnlyField, signedIn } from "../access"
import { refreshSession, sessionStrategy } from "../auth"

/**
 * Staff Users (apps/site ADR-0003). They sign in with Entra ID (src/auth)
 * and have no password: Payload's local strategy is off, and the
 * `site-session` strategy authenticates every request. A Staff User is
 * created on first sign-in, keyed by Entra `oid`, and never in the Admin.
 */
export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "name", "updatedAt"],
  },
  auth: {
    disableLocalStrategy: true,
    strategies: [sessionStrategy],
  },
  hooks: {
    refresh: [refreshSession],
  },
  access: {
    create: nobody,
    read: signedIn,
    update: signedIn,
    delete: signedIn,
  },
  fields: [
    {
      name: "email",
      type: "email",
      required: true,
      unique: true,
      access: { update: readOnlyField },
      admin: { readOnly: true, description: "From Entra ID." },
    },
    { name: "name", type: "text" },
    {
      name: "entraOid",
      label: "Entra object ID",
      type: "text",
      required: true,
      unique: true,
      access: { update: readOnlyField },
      admin: { readOnly: true, position: "sidebar" },
    },
  ],
}
