import type { CollectionAfterChangeHook } from 'payload'

import { revalidateTag } from 'next/cache'

import { tenantGlobalTag } from '@/server/getGlobals'

export const revalidateTheme: CollectionAfterChangeHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) {
    const tag = tenantGlobalTag('theme', doc.tenant)
    payload.logger.info(`Revalidating ${tag}`)
    revalidateTag(tag, 'max')
  }

  return doc
}
