import type { CollectionAfterChangeHook } from 'payload'

import { revalidateTag } from 'next/cache'

import { tenantGlobalTag } from '@/server/getGlobals'

export const revalidateHeader: CollectionAfterChangeHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) {
    const tag = tenantGlobalTag('header', doc.tenant)
    payload.logger.info(`Revalidating ${tag}`)
    revalidateTag(tag, 'max')
  }

  return doc
}
