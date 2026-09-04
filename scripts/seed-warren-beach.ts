/**
 * Seeds the Warren Beach tenant and its per-tenant settings: Site Settings,
 * Header, Footer and Theme. Facts come from warrenbeachrentals.com.
 *
 * Idempotent: the tenant is matched by slug and each settings document by
 * tenant, then created or updated. Pages, media and nav items that link to
 * pages are not seeded here; they come with the content import.
 *
 * Run with: pnpm seed:warren-beach   (local D1; NODE_ENV=production targets the remote database)
 * Not `payload run`: it swallows errors and drops the log lines on exit.
 */
import configPromise from '@payload-config'
import { getPayload, type Payload } from 'payload'

const tenant = {
  name: 'Warren Beach',
  slug: 'warren-beach',
  domains: [{ domain: 'localhost' }, { domain: 'warrenbeachrentals.com' }, { domain: 'www.warrenbeachrentals.com' }],
}

const siteSettings = {
  general: {
    siteName: 'Warren Beach Rentals',
    siteDescription:
      'Vacation rentals from Panama City Beach to 30A, Destin and Navarre Beach. Family-owned on the Emerald Coast since 1998.',
  },
  seo: {
    metaTitleSuffix: ' | Warren Beach Rentals',
    noIndex: true, // turn off before launch
  },
  social: {
    socialLinks: [
      { platform: 'facebook' as const, url: 'https://www.facebook.com/WarrenBeachRentals' },
      { platform: 'instagram' as const, url: 'https://www.instagram.com/warrenbeachrentals/' },
    ],
  },
}

const header = {
  brand: 'Warren Beach Rentals',
  ctaLink: { label: 'Guest login', url: 'https://warrenbeachrentals.trackhs.com/guest/', newTab: true },
}

const footer = {
  tagline: 'Vacation rentals from Panama City Beach to 30A, Destin and Navarre Beach.',
  navItems: [
    { link: { type: 'custom' as const, label: 'Guest login', url: 'https://warrenbeachrentals.trackhs.com/guest/', newTab: true } },
    { link: { type: 'custom' as const, label: 'Owner login', url: 'https://warrenbeachrentals.trackhs.com/owner/', newTab: true } },
  ],
  contact: {
    phone: '850.231.0835',
    address: '169 Griffin Blvd, Unit 120\nPanama City Beach, FL 32413',
    hours: 'Mon to Sat 9 AM to 5 PM\nSun 10 AM to 3 PM',
  },
  copyright: 'Warren Beach Rentals. All rights reserved.',
}

const theme = {
  light: { primary: '#0f766e', primaryForeground: '#ffffff' },
  typography: { bodyFont: 'inter' as const, headingFont: 'playfair' as const },
  shape: { radius: 'xl' as const },
}

// Hooks call revalidateTag, which only works inside a Next request.
const context = { disableRevalidate: true }

type TenantSlug = 'site-settings' | 'header' | 'footer' | 'theme'

async function upsertForTenant(payload: Payload, collection: TenantSlug, tenantId: number | string, data: object) {
  const { docs } = await payload.find({ collection, where: { tenant: { equals: tenantId } }, limit: 1 })
  const body = { ...data, tenant: tenantId } as any
  if (docs[0]) {
    await payload.update({ collection, id: docs[0].id, data: body, context })
    payload.logger.info(`${collection}: updated`)
  } else {
    await payload.create({ collection, data: body, context })
    payload.logger.info(`${collection}: created`)
  }
}

async function run() {
  const payload = await getPayload({ config: configPromise })

  const { docs: existing } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: tenant.slug } },
    limit: 1,
  })
  const tenantDoc = existing[0]
    ? await payload.update({ collection: 'tenants', id: existing[0].id, data: tenant, context })
    : await payload.create({ collection: 'tenants', data: tenant, context })
  payload.logger.info(`tenant ${tenant.slug}: ${existing[0] ? 'updated' : 'created'} (id ${tenantDoc.id})`)

  await upsertForTenant(payload, 'site-settings', tenantDoc.id, siteSettings)
  await upsertForTenant(payload, 'header', tenantDoc.id, header)
  await upsertForTenant(payload, 'footer', tenantDoc.id, footer)
  await upsertForTenant(payload, 'theme', tenantDoc.id, theme)

  payload.logger.info('Done.')
  process.exit(0)
}

run()
