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

import { context } from './seed/lib'
import { seedSite } from './seed/site'
import { sunPalace } from './seed/sun-palace'
import { warrenBeach } from './seed/warren-beach'

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
  { name: 'Warren Beach', slug: 'warren-beach', domains: [{ domain: 'warren-beach.localhost' }], content: warrenBeach },
  { name: 'Sun Palace', slug: 'sun-palace', domains: [{ domain: 'sun-palace.localhost' }], content: sunPalace },
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
  const { content: _content, ...data } = tenant
  const { docs } = await payload.find({ collection: 'tenants', where: { slug: { equals: tenant.slug } }, limit: 1 })
  const doc = docs[0]
    ? await payload.update({ collection: 'tenants', id: docs[0].id, data, context })
    : await payload.create({ collection: 'tenants', data, context })
  payload.logger.info(`tenant ${tenant.slug}: ${docs[0] ? 'updated' : 'created'} (id ${doc.id})`)
  return doc.id
}

async function run() {
  const payload = await getPayload({ config: configPromise })
  await seedAdmin(payload)
  for (const tenant of tenants) {
    const id = await seedTenant(payload, tenant)
    await seedSite(payload, id, tenant.content)
  }
  payload.logger.info('Done.')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
