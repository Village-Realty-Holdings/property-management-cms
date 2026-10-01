import type { MultiTenantPluginConfig } from "@payloadcms/plugin-multi-tenant/types"

/**
 * Site-scoped collections, registered with the multi-tenant plugin, which
 * adds a required `site` field, the admin Site selector and a Site constraint
 * on staff access. Add one line per content collection:
 * `slug: { ...plugin collection options },`
 *
 * Sites, Users, SiteReaders, Amenities and PropertyTypes are NOT Site-scoped
 * and must not appear here (see docs/module-layout.md).
 */
// prettier-ignore
export const tenantCollections: MultiTenantPluginConfig["collections"] = {
  properties: {},
  locations: {},
  specials: {},
  reviews: {},
  pages: {},
  guides: {},
  "curated-lists": {},
  media: {},
  // Declares its own `site` field: SiteReaders create Submissions.
  submissions: { customTenantField: true },
}
