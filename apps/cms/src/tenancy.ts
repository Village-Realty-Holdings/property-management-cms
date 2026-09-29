import type { MultiTenantPluginConfig } from "@payloadcms/plugin-multi-tenant/types"

/**
 * Site-scoped collections, registered with the multi-tenant plugin.
 * Add one line per content collection: `slug: { ...plugin collection options },`
 *
 * Sites, Users, SiteReaders, Amenities and PropertyTypes are NOT Site-scoped
 * and must not appear here (see docs/module-layout.md).
 */
export const tenantCollections: MultiTenantPluginConfig["collections"] = {
  // one line per Site-scoped collection
}
