/**
 * Seeds the root super admin, the two tenants, and each tenant's starter
 * content: settings, theme, header, footer and the first pages. Photos are
 * fetched from the tenant's current site.
 *
 * Idempotent: every document is matched on a natural key (email, slug,
 * filename, title) within its tenant, then created or updated.
 *
 * Run with: npm run seed
 * (local D1; NODE_ENV=production targets the remote database)
 * Not `payload run`: it swallows errors and drops the log lines on exit.
 */
import configPromise from '@payload-config'
import { getPayload, type Payload } from 'payload'

import { findPreset } from '@/lib/themePresets'
import { context, upsertGlobal } from './seed/lib'
import { seedWarrenBeach } from './seed/warren-beach'

// Dev credentials. Set SEED_ADMIN_PASSWORD when seeding a remote database.
const admin = {
  name: 'Root Admin',
  email: 'root@admin.com',
  password: process.env.SEED_ADMIN_PASSWORD ?? '2026root',
  roles: ['super-admin' as const],
}

// Each tenant is served on its own subdomain. Nothing claims the bare host,
// so localhost itself is left for a tenant picker.
const tenants = [
  { name: 'Warren Beach', slug: 'warren-beach', domains: [{ domain: 'warren-beach.localhost' }] },
  { name: 'Sun Palace', slug: 'sun-palace', domains: [{ domain: 'sun-palace.localhost' }] },
]

async function seedAdmin(payload: Payload) {
  const { docs } = await payload.find({ collection: 'users', where: { email: { equals: admin.email } }, limit: 1 })
  if (docs[0]) {
    await payload.update({ collection: 'users', id: docs[0].id, data: admin })
    payload.logger.info(`user ${admin.email}: updated`)
  } else {
    await payload.create({ collection: 'users', data: admin })
    payload.logger.info(`user ${admin.email}: created`)
  }
}

async function seedTenant(payload: Payload, tenant: (typeof tenants)[number]) {
  const { docs } = await payload.find({ collection: 'tenants', where: { slug: { equals: tenant.slug } }, limit: 1 })
  const doc = docs[0]
    ? await payload.update({ collection: 'tenants', id: docs[0].id, data: tenant, context })
    : await payload.create({ collection: 'tenants', data: tenant, context })
  payload.logger.info(`tenant ${tenant.slug}: ${docs[0] ? 'updated' : 'created'} (id ${doc.id})`)
  return doc.id
}

/** Sun Palace has no content yet; a name and a theme keep it distinct from Warren Beach. */
async function seedSunPalace(payload: Payload, tenant: number | string) {
  await upsertGlobal(payload, 'site-settings', tenant, {
    general: { siteName: 'Sun Palace Vacation Homes' },
    seo: { noIndex: true },
  })
  await upsertGlobal(payload, 'header', tenant, { brand: 'Sun Palace' })
  const preset = findPreset('coastal-teal')!
  await upsertGlobal(payload, 'theme', tenant, { preset: preset.key, ...preset })
}

async function run() {
  const payload = await getPayload({ config: configPromise })
  await seedAdmin(payload)
  const ids: Record<string, number | string> = {}
  for (const tenant of tenants) ids[tenant.slug] = await seedTenant(payload, tenant)
  await seedWarrenBeach(payload, ids['warren-beach']!)
  await seedSunPalace(payload, ids['sun-palace']!)
  payload.logger.info('Done.')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
