/**
 * One-off backfill: copies each tenant's header.brand -> siteSettings.siteName
 * and footer.tagline -> siteSettings.siteDescription, so SEO output doesn't
 * regress now that generateMeta reads from Site Settings instead of Header/
 * Footer. Safe to re-run: only fills siteName/siteDescription when empty.
 *
 * Run with: npx payload run scripts/backfill-site-settings.ts
 */
import configPromise from '@payload-config'
import { getPayload } from 'payload'

async function run() {
  const payload = await getPayload({ config: configPromise })

  const { docs: tenants } = await payload.find({ collection: 'tenants', limit: 0 })

  for (const tenant of tenants) {
    const tenantId = tenant.id

    const [{ docs: headers }, { docs: footers }, { docs: siteSettingsDocs }] = await Promise.all([
      payload.find({ collection: 'header', where: { tenant: { equals: tenantId } }, limit: 1 }),
      payload.find({ collection: 'footer', where: { tenant: { equals: tenantId } }, limit: 1 }),
      payload.find({ collection: 'site-settings', where: { tenant: { equals: tenantId } }, limit: 1 }),
    ])

    const brand = headers[0]?.brand
    const tagline = footers[0]?.tagline
    const existing = siteSettingsDocs[0]

    if (!brand && !tagline) {
      payload.logger.info(`Tenant ${tenant.slug}: no header.brand or footer.tagline to backfill, skipping.`)
      continue
    }

    const siteName = !existing?.general?.siteName && brand ? brand : undefined
    const siteDescription = !existing?.general?.siteDescription && tagline ? tagline : undefined

    if (!siteName && !siteDescription) {
      payload.logger.info(`Tenant ${tenant.slug}: siteSettings already populated, skipping.`)
      continue
    }

    const data = {
      tenant: tenantId,
      general: {
        ...(existing?.general ?? {}),
        ...(siteName ? { siteName } : {}),
        ...(siteDescription ? { siteDescription } : {}),
      },
    }

    if (existing) {
      await payload.update({ collection: 'site-settings', id: existing.id, data })
    } else {
      await payload.create({ collection: 'site-settings', data })
    }

    payload.logger.info(
      `Tenant ${tenant.slug}: backfilled ${[siteName && 'siteName', siteDescription && 'siteDescription'].filter(Boolean).join(', ')}.`,
    )
  }

  payload.logger.info('Done.')
  process.exit(0)
}

run()
