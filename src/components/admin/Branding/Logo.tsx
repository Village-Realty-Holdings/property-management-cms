import React from 'react'

import { brandFor } from '@/lib/adminBranding'
import { findTenantByHost } from '@/server/getTenant'

/** Wordmark on the login and account screens. */
export const Logo: React.FC = async () => {
  const brand = brandFor(await findTenantByHost())

  return <img alt={brand.name} className="brand-logo" src={brand.logoUrl} />
}
