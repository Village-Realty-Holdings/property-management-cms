import type { Metadata } from 'next'

/** Open Graph defaults for the tenant; per-page values override them. */
export const mergeOpenGraph = (
  site: { name?: string | null; description?: string | null } | null | undefined,
  og?: Metadata['openGraph'],
): Metadata['openGraph'] => {
  const defaults: Metadata['openGraph'] = {
    type: 'website',
    siteName: site?.name ?? undefined,
    title: site?.name ?? undefined,
    description: site?.description ?? undefined,
  }
  return { ...defaults, ...og }
}
