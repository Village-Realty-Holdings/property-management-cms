import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

import type { Footer, Header } from '@/payload-types'

import { resolveTenant } from './getTenant'

type TenantGlobals = { header: Header; footer: Footer }
type Slug = keyof TenantGlobals

const idOf = (tenant: unknown): string =>
  typeof tenant === 'object' && tenant !== null && 'id' in tenant
    ? String((tenant as { id: unknown }).id)
    : String(tenant ?? '')

/** Cache tag for one tenant's header or footer document. */
export const tenantGlobalTag = (slug: Slug, tenant: unknown) => `${slug}_${idOf(tenant)}`

async function findTenantGlobal<T extends Slug>(slug: T, tenantId: string, depth: number) {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: slug,
    depth,
    limit: 1,
    where: { tenant: { equals: tenantId } },
    overrideAccess: true,
  })
  return (docs[0] ?? null) as TenantGlobals[T] | null
}

/**
 * The header or footer for the tenant of the current request, or null when
 * the tenant has none yet. Cached per tenant and invalidated by the
 * collection's afterChange hook.
 */
export const getTenantGlobal = async <T extends Slug>(slug: T, depth = 1) => {
  const tenant = await resolveTenant()
  if (!tenant) return null
  const tenantId = String(tenant.id)
  return unstable_cache(() => findTenantGlobal(slug, tenantId, depth), [slug, tenantId, String(depth)], {
    tags: [tenantGlobalTag(slug, tenantId)],
  })()
}
