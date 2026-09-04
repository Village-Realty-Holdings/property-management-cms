import type { Tenant } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers } from 'next/headers'
import { unstable_cache } from 'next/cache'

/**
 * Which tenant a request belongs to, by hostname.
 *
 * Order: a tenant whose `domains` lists the request host, then the tenant
 * named by `DEFAULT_TENANT` (a slug), then the first tenant. Tenant docs are
 * cached under the `tenants` tag; the Tenants collection revalidates it.
 */
const listTenants = unstable_cache(
  async () => {
    const payload = await getPayload({ config: configPromise })
    const { docs } = await payload.find({
      collection: 'tenants',
      limit: 100,
      pagination: false,
      sort: 'createdAt',
      overrideAccess: true,
    })
    return docs
  },
  ['tenants'],
  { tags: ['tenants'] },
)

const hostOf = async () => {
  const h = await headers()
  const raw = h.get('x-forwarded-host') ?? h.get('host') ?? ''
  return raw.split(',')[0]!.trim().toLowerCase().replace(/:\d+$/, '')
}

export const resolveTenant = async (host?: string): Promise<Tenant | null> => {
  const tenants = await listTenants()
  if (tenants.length === 0) return null
  const hostname = host ?? (await hostOf())

  const byDomain = tenants.find((t) => (t.domains ?? []).some((d) => d.domain.toLowerCase() === hostname))
  if (byDomain) return byDomain

  const fallbackSlug = process.env.DEFAULT_TENANT
  const byEnv = fallbackSlug ? tenants.find((t) => t.slug === fallbackSlug) : undefined
  return byEnv ?? tenants[0] ?? null
}
