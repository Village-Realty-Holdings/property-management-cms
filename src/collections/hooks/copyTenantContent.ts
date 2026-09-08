import type { CollectionAfterChangeHook } from 'payload'

import type { Tenant } from '@/payload-types'

import { cloneTenantContent } from '@/server/cloneTenant'

/**
 * A new tenant created with "Start from" set gets that tenant's site copied
 * in. The choice is cleared afterwards so the field never shows on edit and
 * the copy never runs twice.
 */
export const copyTenantContent: CollectionAfterChangeHook<Tenant> = async ({ doc, operation, req }) => {
  const from = typeof doc.copyFrom === 'object' && doc.copyFrom ? doc.copyFrom.id : doc.copyFrom
  if (operation !== 'create' || !from || req.context.cloneTenant) return doc

  const { payload } = req
  try {
    await cloneTenantContent({ payload, from, to: doc.id, req })
  } catch (error) {
    payload.logger.error({ err: error, msg: `tenant ${doc.id}: copy from tenant ${from} failed` })
    throw new Error(`The tenant was created, but copying from the other tenant failed: ${(error as Error).message}`)
  } finally {
    await payload.update({
      collection: 'tenants',
      id: doc.id,
      data: { copyFrom: null },
      context: { ...req.context, cloneTenant: true, disableRevalidate: true },
      req,
    })
  }
  return { ...doc, copyFrom: null }
}
