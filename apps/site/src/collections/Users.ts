import type { Access, CollectionConfig } from "payload"

import { nobody, readOnlyField, signedIn } from "../access"
import { sessionStrategy } from "../auth"

/**
 * A signed-in User can delete any User but themselves, so the Users screen's
 * rule holds over `/api` too. With an id the check is direct; a bulk delete
 * gets a filter that leaves the caller out.
 */
const removeOthers: Access = ({ req, id }) => {
  if (!req.user) return false
  if (id !== undefined) return String(id) !== String(req.user.id)
  return { id: { not_equals: req.user.id } }
}

/**
 * This Site's Users (apps/site ADR-0015). Who someone is and which Sites they
 * may use lives in the Registry, shared by every Site; this collection keeps
 * one record per Registry User who has signed in here, for Pages and Layouts
 * to point at. Payload's local strategy is off (passwords are the Registry's),
 * and the `site-session` strategy authenticates every request. A record is
 * created on first sign-in, keyed by `registryUserId`, and never in the Admin.
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
  access: {
    create: nobody,
    read: signedIn,
    update: signedIn,
    delete: removeOthers,
  },
  fields: [
    {
      name: "email",
      type: "email",
      required: true,
      unique: true,
      access: { update: readOnlyField },
      admin: { readOnly: true, description: "From the Registry." },
    },
    { name: "name", type: "text" },
    {
      name: "registryUserId",
      label: "Registry User",
      type: "number",
      required: true,
      unique: true,
      access: { update: readOnlyField },
      admin: { readOnly: true, position: "sidebar" },
    },
  ],
}
