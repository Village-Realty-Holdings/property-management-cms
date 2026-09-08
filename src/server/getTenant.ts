import type { Tenant } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cookies, draftMode, headers } from 'next/headers'
import { unstable_cache } from 'next/cache'

/**
 * Cookie set by `/next/preview` naming the tenant to render. Only read while
 * draft mode is on, so it cannot leak into normal visits.
 */
export const PREVIEW_TENANT_COOKIE = 'preview-tenant'

/**
 * Which tenant a request belongs to, by hostname.
 *
 * Order: in draft mode, the tenant named by the preview cookie; then a tenant whose `domains` lists the request host, then the tenant
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

export const hostOf = async () => {
  const h = await headers()
  const raw = h.get('x-forwarded-host') ?? h.get('host') ?? ''
  return raw.split(',')[0]!.trim().toLowerCase().replace(/:\d+$/, '')
}

/**
 * The tenant whose `domains` list the request host, or null when no tenant
 * claims it. Unlike `resolveTenant` there is no fallback: the admin panel uses
 * this to decide whether it is being served on a tenant's own domain.
 */
export const findTenantByHost = async (host?: string): Promise<Tenant | null> => {
  const tenants = await listTenants()
  const hostname = host ?? (await hostOf())
  return tenants.find((t) => (t.domains ?? []).some((d) => d.domain.toLowerCase() === hostname)) ?? null
}

export const resolveTenant = async (host?: string): Promise<Tenant | null> => {
  const tenants = await listTenants()
  if (tenants.length === 0) return null

  if (!host && (await draftMode()).isEnabled) {
    const previewId = (await cookies()).get(PREVIEW_TENANT_COOKIE)?.value
    const byPreview = previewId ? tenants.find((t) => String(t.id) === previewId) : undefined
    if (byPreview) return byPreview
  }

  const byDomain = await findTenantByHost(host)
  if (byDomain) return byDomain

  const fallbackSlug = process.env.DEFAULT_TENANT
  const byEnv = fallbackSlug ? tenants.find((t) => t.slug === fallbackSlug) : undefined
  return byEnv ?? tenants[0] ?? null
}

/** `where` clause limiting a query to the current request's tenant; empty when there is none. */
export const tenantWhere = async (): Promise<Record<string, unknown>> => {
  const tenant = await resolveTenant()
  return tenant ? { tenant: { equals: tenant.id } } : {}
}
