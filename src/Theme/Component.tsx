import React from 'react'

import { themeToCss } from '@/lib/themeCss'
import type { Theme } from '@/payload-types'

/**
 * Inline style block with the tenant's token overrides. Rendered in `<head>`
 * so the first paint already has the right colours. The CSS comes from
 * `themeToCss`, which only emits validated values.
 */
export const TenantThemeStyle: React.FC<{ theme: Theme | null }> = ({ theme }) => {
  const css = themeToCss(theme)
  if (!css) return null
  return <style id="tenant-theme" dangerouslySetInnerHTML={{ __html: css }} />
}
