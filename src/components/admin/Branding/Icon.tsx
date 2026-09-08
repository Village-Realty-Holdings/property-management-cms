import React from 'react'

import { brandFor } from '@/lib/adminBranding'
import { findTenantByHost } from '@/server/getTenant'

/** Square mark at the top of the admin nav. */
export const Icon: React.FC = async () => {
  const brand = brandFor(await findTenantByHost())

  return <img alt={brand.name} className="brand-icon" src={brand.iconUrl} />
}
