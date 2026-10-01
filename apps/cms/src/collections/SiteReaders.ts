import type { CollectionConfig } from "payload"

import {
  adminOfSite,
  getUserSiteIds,
  hasAccessToAllSites,
  syncOnly,
} from "../access"

/**
 * The read credential of one Site's deployment (ADR-0007, ADR-0010). The Site
 * deployment sends `Authorization: site-readers API-Key <key>` and can then
 * read only its own Site's published content (and create Submissions for it).
 * Drafts are previewed in the CMS, not with a key (ADR-0018).
 * Not Staff Users, and not Site-scoped by the multi-tenant plugin: it IS the
 * per-Site credential, so its `site` is a plain relationship.
 */
export const SiteReaders: CollectionConfig = {
  slug: "site-readers",
  labels: { singular: "Site Reader", plural: "Site Readers" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "site"],
    group: "Settings",
    description:
      "API keys for Site deployments. Each can read only its own Site.",
  },
  auth: {
    useAPIKey: true,
    disableLocalStrategy: true,
  },
  access: {
    create: adminOfSite,
    read: adminOfSite,
    update: adminOfSite,
    delete: adminOfSite,
    unlock: syncOnly,
  },
  fields: [
    {
      name: "name",
      type: "text",
      admin: { description: "e.g. demo-beach production" },
    },
    {
      name: "site",
      type: "relationship",
      relationTo: "sites",
      required: true,
      index: true,
      filterOptions: ({ req }) =>
        req.user && !hasAccessToAllSites(req.user)
          ? { id: { in: getUserSiteIds(req) } }
          : true,
    },
  ],
}
