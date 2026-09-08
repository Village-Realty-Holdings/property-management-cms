import React from 'react'

import { brandFor, contrastFor } from '@/lib/adminBranding'
import { findTenantByHost } from '@/server/getTenant'

/**
 * Admin provider that publishes the current brand's accent colour as CSS
 * variables. `custom.css` maps them onto Payload's buttons, focus rings and
 * active nav links.
 */
export const AccentStyle: React.FC<{ children?: React.ReactNode }> = async ({ children }) => {
  const brand = brandFor(await findTenantByHost())
  const css = `:root{--brand-accent:${brand.accent};--brand-on-accent:${contrastFor(brand.accent)}}`

  return (
    <>
      <style>{css}</style>
      {children}
    </>
  )
}
