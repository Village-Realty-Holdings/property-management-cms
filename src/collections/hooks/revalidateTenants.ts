import { revalidateTag } from 'next/cache'

/** Tenant docs are cached for hostname resolution; drop the cache on any change. */
export const revalidateTenants = ({ doc, req }: { doc: unknown; req: { context: { disableRevalidate?: boolean } } }) => {
  if (!req.context.disableRevalidate) revalidateTag('tenants', 'max')
  return doc
}
