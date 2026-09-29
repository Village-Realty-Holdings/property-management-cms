import type { CollectionConfig } from "payload"

/** Staff Users (apps/site ADR-0003). */
export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
  },
  auth: true,
  fields: [{ name: "name", type: "text" }],
}
